import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import type { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'created_at'>;
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, '未提供认证令牌'));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Omit<User, 'created_at'>;
    req.user = decoded;
    next();
  } catch (err) {
    next(new AppError(401, '无效的认证令牌'));
  }
}

export function createToken(user: Omit<User, 'created_at'>): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}