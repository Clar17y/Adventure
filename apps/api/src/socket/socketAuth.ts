import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { AuthPayload } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface SocketPlayerData {
  playerId: string;
  username: string;
  role: string;
}

export function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Missing auth token'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    socket.data = { playerId: payload.playerId, username: payload.username, role: payload.role } satisfies SocketPlayerData;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
