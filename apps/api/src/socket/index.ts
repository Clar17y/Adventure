import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { authenticateSocket } from './socketAuth';
import { registerChatHandlers } from './chatHandlers';

let ioInstance: SocketServer | null = null;

export function getIo(): SocketServer | null {
  return ioInstance;
}

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

  ioInstance = io;

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerChatHandlers(io, socket);
  });

  return io;
}
