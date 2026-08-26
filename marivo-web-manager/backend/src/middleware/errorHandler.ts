import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, statusCode: err.statusCode },
    });
  }

  // Multer errors
  if (err.message?.includes('File too large')) {
    return res.status(413).json({
      error: { message: '文件大小超过限制（最大 100MB）', statusCode: 413 },
    });
  }

  return res.status(500).json({
    error: { message: '服务器内部错误', statusCode: 500 },
  });
}