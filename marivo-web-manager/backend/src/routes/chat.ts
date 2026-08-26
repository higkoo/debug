import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../models/database';

export const chatRouter = Router();

// POST /api/chat/send - Send message and get streaming response
chatRouter.post('/send', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, message, conversationId } = req.body;

  if (!projectId || !message) {
    throw new AppError(400, '请提供项目 ID 和消息内容');
  }

  // Get project info
  const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (projectResult.rows.length === 0) {
    throw new AppError(404, '项目不存在');
  }

  const project = projectResult.rows[0];
  let convId = conversationId;

  // Create or get conversation
  if (!convId) {
    const convResult = await query(
      `INSERT INTO conversations (id, project_id, user_id, title, messages)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uuidv4(), projectId, req.user!.id, message.slice(0, 50), JSON.stringify([])]
    );
    convId = convResult.rows[0].id;
  }

  // Save user message
  const userMsg = { role: 'user', content: message, timestamp: Date.now() };
  await query(
    `UPDATE conversations SET messages = messages || $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify([userMsg]), convId]
  );

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send acknowledgment
  res.write(`data: ${JSON.stringify({ type: 'conversation_id', conversation_id: convId })}\n\n`);

  try {
    // Build context from project
    const projectContext = buildProjectContext(project);
    const systemPrompt = `你是一个数据分析助手，正在分析一个 Marivo 数据项目。\n\n项目信息：\n${projectContext}\n\n请根据用户的问题，基于项目的数据分析能力回答。如果用户要求运行分析，请建议具体的分析命令。`;

    // Try AI streaming if API key is configured
    const apiKey = process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY;
    const useAI = !!apiKey;

    if (useAI) {
      await streamAIResponse(systemPrompt, message, res, apiKey!);
    } else {
      // Fallback: generate a structured response
      const fallbackResponse = generateFallbackResponse(message, project);
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallbackResponse })}\n\n`);
    }

    // Save assistant response
    const assistantMsg = { role: 'assistant', content: '(streaming response)', timestamp: Date.now() };
    await query(
      `UPDATE conversations SET messages = messages || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify([assistantMsg]), convId]
    );
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: `分析过程出错: ${(err as Error).message}` })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// GET /api/chat/conversations/:projectId - Get all conversations for a project
chatRouter.get('/conversations/:projectId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query(
    'SELECT id, title, created_at, updated_at FROM conversations WHERE project_id = $1 AND user_id = $2 ORDER BY updated_at DESC',
    [req.params.projectId, req.user!.id]
  );
  res.json({ conversations: result.rows });
});

// GET /api/chat/conversation/:id - Get conversation detail
chatRouter.get('/conversation/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query('SELECT * FROM conversations WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);
  if (result.rows.length === 0) {
    throw new AppError(404, '对话不存在');
  }
  res.json({ conversation: result.rows[0] });
});

// DELETE /api/chat/conversation/:id
chatRouter.delete('/conversation/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  await query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);
  res.json({ message: '对话已删除' });
});

// GET /api/chat/bookmarks - Get user's bookmarks
chatRouter.get('/bookmarks', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query(
    `SELECT b.*, c.title as conversation_title, p.name as project_name
     FROM bookmarks b
     LEFT JOIN conversations c ON b.conversation_id = c.id
     LEFT JOIN projects p ON b.project_id = p.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user!.id]
  );
  res.json({ bookmarks: result.rows });
});

// POST /api/chat/bookmarks - Create a bookmark
chatRouter.post('/bookmarks', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { conversationId, projectId, label, note } = req.body;

  if (!conversationId) {
    throw new AppError(400, '请提供对话 ID');
  }

  const result = await query(
    `INSERT INTO bookmarks (id, user_id, conversation_id, project_id, label, note)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [uuidv4(), req.user!.id, conversationId, projectId || null, label || '书签', note || '']
  );

  res.status(201).json({ bookmark: result.rows[0] });
});

// DELETE /api/chat/bookmarks/:id - Delete a bookmark
chatRouter.delete('/bookmarks/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  await query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);
  res.json({ message: '书签已删除' });
});

function buildProjectContext(project: any): string {
  return `项目名称: ${project.name}
描述: ${project.description || '无'}
来源: ${project.source_type === 'import' ? `远程仓库 (${project.repo_url})` : '本地上传'}
标签: ${(project.tags || []).join(', ') || '无'}
文件结构: ${JSON.stringify(project.file_structure, null, 2)}`;
}

async function streamAIResponse(systemPrompt: string, userMessage: string, res: Response, apiKey: string) {
  const isOpenAI = !!process.env.OPENAI_API_KEY;
  const endpoint = isOpenAI
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';

  if (isOpenAI) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
            }
          } catch { /* skip parse errors */ }
        }
      }
    }
  } else {
    // Claude API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: parsed.delta.text })}\n\n`);
            }
          } catch { /* skip */ }
        }
      }
    }
  }
}

function generateFallbackResponse(message: string, project: any): string {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('数据源') || lowerMsg.includes('data source') || lowerMsg.includes('什么数据')) {
    return `## 数据源分析\n\n该项目 "${project.name}" 的配置信息：\n\n- **描述**: ${project.description || '暂无描述'}\n- **来源**: ${project.repo_url || '本地上传'}\n- **标签**: ${(project.tags || []).join(', ') || '无'}\n\n请查看项目中的 \`marivo.toml\` 配置文件了解详细的数据源定义。`;
  }

  if (lowerMsg.includes('分析维度') || lowerMsg.includes('dimension') || lowerMsg.includes('可用')) {
    return `## 可用分析维度\n\n该项目包含以下分析维度：\n\n1. **数据模型**: 查看 \`models/\` 目录下的文件了解可用模型\n2. **分析任务**: 使用 \`make verify\` 检查可用的分析任务\n3. **自定义分析**: 你可以通过对话提出具体的分析需求\n\n> 提示：你可以运行分析任务来获取实际的数据分析结果。`;
  }

  if (lowerMsg.includes('运行') || lowerMsg.includes('run') || lowerMsg.includes('执行') || lowerMsg.includes('分析')) {
    return `## 运行分析\n\n要对该项目执行分析，请使用以下命令：\n\n\`\`\`bash\ncd ${project.local_path}\nmake setup    # 初始化环境\nmake verify   # 验证项目配置\n\`\`\`\n\n你也可以在界面上点击"运行分析"按钮来执行。分析结果将实时显示。`;
  }

  return `## 分析助手\n\n你好！我正在分析项目 "${project.name}"。\n\n该项目包含以下功能：\n\n- **分析能力**: 基于 Marivo 框架的数据分析\n- **数据模型**: 定义在 \`models/\` 目录中\n- **配置**: 通过 \`marivo.toml\` 管理\n\n你可以问以下问题：\n1. 这个项目的数据源是什么？\n2. 有哪些可用的分析维度？\n3. 运行一个分析任务\n4. 帮我解读分析结果\n\n请告诉我你想了解什么？`;
}