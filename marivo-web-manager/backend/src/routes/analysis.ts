import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../models/database';
import { globalTaskQueue } from '../services/taskQueue';

export const analysisRouter = Router();

// POST /api/analysis/run - Submit analysis task to queue
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

  if (!fs.existsSync(projectDir)) {
    throw new AppError(400, '项目本地目录不存在，请重新导入');
  }

  // Create analysis session record
  await query(
    `INSERT INTO analysis_sessions (id, project_id, user_id, status, command)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, projectId, req.user!.id, 'queued', command]
  );

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'session_id', session_id: sessionId })}\n\n`);

  // Enqueue task
  globalTaskQueue.enqueue({
    id: sessionId,
    projectId,
    userId: req.user!.id,
    command,
    projectDir,
    status: 'queued',
    createdAt: new Date(),
    sseRes: res,
  });

  // Listen for task start to update DB
  const onStarted = async (task: any) => {
    if (task.id === sessionId) {
      await query(
        `UPDATE analysis_sessions SET status = 'running' WHERE id = $1`,
        [sessionId]
      );
      globalTaskQueue.removeListener('started', onStarted);
    }
  };
  globalTaskQueue.on('started', onStarted);

  // Listen for completion to update DB
  const onCompleted = async (task: any) => {
    if (task.id === sessionId) {
      await query(
        `UPDATE analysis_sessions SET status = $1, output = $2, results = $3, completed_at = NOW() WHERE id = $4`,
        [task.status, task.output || '', JSON.stringify(task.results || {}), sessionId]
      );
      globalTaskQueue.removeListener('completed', onCompleted);
      globalTaskQueue.removeListener('failed', onCompleted);
    }
  };
  globalTaskQueue.on('completed', onCompleted);
  globalTaskQueue.on('failed', onCompleted);
});

// GET /api/analysis/queue - Get queue status
analysisRouter.get('/queue', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  const status = globalTaskQueue.getStatus();
  res.json({
    ...status,
    queued: globalTaskQueue.getQueuedTasks(),
    running: globalTaskQueue.getRunningTasks(),
  });
});

// DELETE /api/analysis/queue/:taskId - Cancel a queued task
analysisRouter.delete('/queue/:taskId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const cancelled = globalTaskQueue.cancelTask(req.params.taskId);
  if (cancelled) {
    await query(
      `UPDATE analysis_sessions SET status = 'failed', output = '任务已被取消', completed_at = NOW() WHERE id = $1`,
      [req.params.taskId]
    );
    res.json({ message: '任务已取消' });
  } else {
    throw new AppError(400, '无法取消该任务（可能正在运行或不存在）');
  }
});

// GET /api/analysis/sessions/:projectId - Get analysis history
analysisRouter.get('/sessions/:projectId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query(
    `SELECT id, status, command, started_at, completed_at
     FROM analysis_sessions
     WHERE project_id = $1 AND user_id = $2
     ORDER BY started_at DESC`,
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