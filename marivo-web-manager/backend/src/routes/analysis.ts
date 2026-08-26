import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../models/database';

export const analysisRouter = Router();

// POST /api/analysis/run - Run analysis command
analysisRouter.post('/run', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, command = 'make verify' } = req.body;

  if (!projectId) {
    throw new AppError(400, '请提供项目 ID');
  }

  const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (projectResult.rows.length === 0) {
    throw new AppError(404, '项目不存在');
  }

  const project = projectResult.rows[0];
  const sessionId = uuidv4();
  const projectDir = project.local_path;

  // Validate project directory
  if (!fs.existsSync(projectDir)) {
    throw new AppError(400, '项目本地目录不存在，请重新导入');
  }

  // Create analysis session
  await query(
    `INSERT INTO analysis_sessions (id, project_id, user_id, status, command)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, projectId, req.user!.id, 'running', command]
  );

  // Set SSE headers for real-time output
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'session_id', session_id: sessionId })}\n\n`);

  try {
    // Run the command
    const child = exec(command, { cwd: projectDir, timeout: 300000 }); // 5 min timeout

    let output = '';

    child.stdout?.on('data', (data: string) => {
      output += data;
      res.write(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`);
    });

    child.stderr?.on('data', (data: string) => {
      output += data;
      res.write(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`);
    });

    child.on('close', async (code) => {
      // Parse results for Marivo output
      const results = parseMarivoOutput(output);

      // Update session
      await query(
        `UPDATE analysis_sessions SET status = $1, output = $2, results = $3, completed_at = NOW() WHERE id = $4`,
        [code === 0 ? 'completed' : 'failed', output, JSON.stringify(results), sessionId]
      );

      res.write(`data: ${JSON.stringify({ type: 'complete', exit_code: code, results })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    child.on('error', async (err) => {
      await query(
        `UPDATE analysis_sessions SET status = 'failed', output = $1, completed_at = NOW() WHERE id = $2`,
        [err.message, sessionId]
      );

      res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });
  } catch (err) {
    await query(
      `UPDATE analysis_sessions SET status = 'failed', completed_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// GET /api/analysis/sessions/:projectId - Get analysis history
analysisRouter.get('/sessions/:projectId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query(
    'SELECT id, status, command, started_at, completed_at FROM analysis_sessions WHERE project_id = $1 AND user_id = $2 ORDER BY started_at DESC',
    [req.params.projectId, req.user!.id]
  );
  res.json({ sessions: result.rows });
});

// GET /api/analysis/session/:id - Get session detail
analysisRouter.get('/session/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query('SELECT * FROM analysis_sessions WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);
  if (result.rows.length === 0) {
    throw new AppError(404, '分析会话不存在');
  }
  res.json({ session: result.rows[0] });
});

function parseMarivoOutput(output: string): any {
  const results: any = {
    raw_output: output,
    metrics: [],
    warnings: [],
    errors: [],
  };

  // Try to parse JSON output lines
  const lines = output.split('\n');
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.metric) results.metrics.push(parsed);
      if (parsed.warning) results.warnings.push(parsed.warning);
      if (parsed.error) results.errors.push(parsed.error);
    } catch {
      // Not JSON line, skip
    }
  }

  // Extract key metrics using regex patterns
  const metricPatterns = [
    { key: 'accuracy', pattern: /accuracy[:\s]*([\d.]+%?)/i },
    { key: 'precision', pattern: /precision[:\s]*([\d.]+%?)/i },
    { key: 'recall', pattern: /recall[:\s]*([\d.]+%?)/i },
    { key: 'f1_score', pattern: /f1[:\s]*([\d.]+%?)/i },
    { key: 'total_records', pattern: /total[:\s]*([\d,]+)/i },
    { key: 'error_rate', pattern: /error[:\s]*([\d.]+%?)/i },
  ];

  for (const { key, pattern } of metricPatterns) {
    const match = output.match(pattern);
    if (match) {
      results.metrics.push({ name: key, value: match[1] });
    }
  }

  return results;
}