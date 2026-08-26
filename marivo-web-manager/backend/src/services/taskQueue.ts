import { EventEmitter } from 'events';

interface Task {
  id: string;
  projectId: string;
  userId: string;
  command: string;
  projectDir: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
  exitCode?: number;
  results?: any;
  sseRes?: any; // SSE response reference
}

export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private running: Map<string, Task> = new Map();
  private maxConcurrent: number;
  private processing = false;

  constructor(maxConcurrent = 2) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  enqueue(task: Task): Task {
    task.status = 'queued';
    task.createdAt = new Date();
    this.queue.push(task);
    this.emit('enqueued', task);
    this.processNext();
    return task;
  }

  private async processNext() {
    if (this.processing) return;

    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const task = this.queue.shift()!;
      this.running.set(task.id, task);
      this.executeTask(task);
    }
  }

  private async executeTask(task: Task) {
    task.status = 'running';
    task.startedAt = new Date();
    this.emit('started', task);

    const { exec } = await import('child_process');
    const child = exec(task.command, { cwd: task.projectDir, timeout: 300000 });

    let output = '';

    child.stdout?.on('data', (data: string) => {
      output += data;
      this.emit('output', { taskId: task.id, type: 'stdout', content: data });
      if (task.sseRes) {
        task.sseRes.write(`data: ${JSON.stringify({ type: 'stdout', content: data })}\n\n`);
      }
    });

    child.stderr?.on('data', (data: string) => {
      output += data;
      this.emit('output', { taskId: task.id, type: 'stderr', content: data });
      if (task.sseRes) {
        task.sseRes.write(`data: ${JSON.stringify({ type: 'stderr', content: data })}\n\n`);
      }
    });

    return new Promise<void>((resolve) => {
      child.on('close', async (code) => {
        task.status = code === 0 ? 'completed' : 'failed';
        task.exitCode = code ?? -1;
        task.output = output;
        task.completedAt = new Date();

        const results = this.parseMarivoOutput(output);
        task.results = results;

        this.running.delete(task.id);
        this.emit('completed', task);

        if (task.sseRes) {
          task.sseRes.write(`data: ${JSON.stringify({ type: 'complete', exit_code: code, results })}\n\n`);
          task.sseRes.write('data: [DONE]\n\n');
          task.sseRes.end();
        }

        resolve();
        this.processNext();
      });

      child.on('error', (err) => {
        task.status = 'failed';
        task.output = err.message;
        task.completedAt = new Date();

        this.running.delete(task.id);
        this.emit('failed', task);

        if (task.sseRes) {
          task.sseRes.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
          task.sseRes.write('data: [DONE]\n\n');
          task.sseRes.end();
        }

        resolve();
        this.processNext();
      });
    });
  }

  private parseMarivoOutput(output: string): any {
    const results: any = { raw_output: output, metrics: [], warnings: [], errors: [] };
    const lines = output.split('\n');
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.metric) results.metrics.push(parsed);
        if (parsed.warning) results.warnings.push(parsed.warning);
        if (parsed.error) results.errors.push(parsed.error);
      } catch { /* skip */ }
    }

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
      if (match) results.metrics.push({ name: key, value: match[1] });
    }

    return results;
  }

  getStatus(): { queueSize: number; runningCount: number; maxConcurrent: number } {
    return {
      queueSize: this.queue.length,
      runningCount: this.running.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  getQueuedTasks(): Task[] {
    return this.queue.map(t => ({
      id: t.id,
      projectId: t.projectId,
      command: t.command,
      status: t.status,
      createdAt: t.createdAt,
    })) as any;
  }

  getRunningTasks(): Task[] {
    return Array.from(this.running.values()).map(t => ({
      id: t.id,
      projectId: t.projectId,
      command: t.command,
      status: t.status,
      startedAt: t.startedAt,
    })) as any;
  }

  cancelTask(taskId: string): boolean {
    // Remove from queue if queued
    const queueIdx = this.queue.findIndex(t => t.id === taskId);
    if (queueIdx >= 0) {
      this.queue.splice(queueIdx, 1);
      this.emit('cancelled', taskId);
      return true;
    }

    // Can't cancel running tasks easily (child process)
    return false;
  }
}

export const globalTaskQueue = new TaskQueue(2);