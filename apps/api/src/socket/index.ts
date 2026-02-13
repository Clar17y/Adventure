import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { authenticateSocket } from './socketAuth';
import { registerChatHandlers } from './chatHandlers';

export function createSocketServer(
  httpServer: HttpServer,
  isAllowedOrigin: (origin: string) => boolean,
): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerChatHandlers(io, socket);
  });

  return io;
}
