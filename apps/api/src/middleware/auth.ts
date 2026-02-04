import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_TTL_MINUTES = Number.parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10);
const REFRESH_TOKEN_TTL_DAYS = Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);

export const authConfig = {
  accessTokenTtlMinutes: Number.isFinite(ACCESS_TOKEN_TTL_MINUTES) && ACCESS_TOKEN_TTL_MINUTES > 0
    ? ACCESS_TOKEN_TTL_MINUTES
    : 15,
  refreshTokenTtlDays: Number.isFinite(REFRESH_TOKEN_TTL_DAYS) && REFRESH_TOKEN_TTL_DAYS > 0
    ? REFRESH_TOKEN_TTL_DAYS
    : 30,
} as const;

export interface AuthPayload {
  playerId: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      player?: AuthPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.player = payload;
    next();
  } catch (err) {
    throw new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
}

export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: authConfig.accessTokenTtlMinutes * 60 });
}

export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: authConfig.refreshTokenTtlDays * 24 * 60 * 60 });
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function refreshTokenExpiresAt(nowMs = Date.now()): Date {
  return new Date(nowMs + authConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
