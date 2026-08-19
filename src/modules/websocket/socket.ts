import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../../config/env.js';
import { verifyAccessToken } from '../auth/jwt.js';

export interface LocationUpdatePayload {
  employeeId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

let ioInstance: SocketIOServer | null = null;

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string') {
    next(new Error('Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.data.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

export function attachSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; role: string };
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
  });

  ioInstance = io;
  return io;
}

export function broadcastLocationUpdate(point: LocationUpdatePayload, rooms: string[]): void {
  ioInstance?.to(rooms).emit('employee:location-update', point);
}
