import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return 'http://localhost:4000';
  }

  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(configured);
      const isConfiguredLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const isRemoteClient = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isConfiguredLoopback && isRemoteClient) {
        const protocol = parsed.protocol || window.location.protocol;
        const port = parsed.port || '4000';
        return `${protocol}//${window.location.hostname}:${port}`;
      }
    } catch {
      // fall through
    }
  }

  return configured;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
