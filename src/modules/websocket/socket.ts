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
    if (payload.role !== 'ADMIN') {
      next(new Error('Forbidden'));
      return;
    }
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
    socket.join('admins');
  });

  ioInstance = io;
  return io;
}

export function broadcastLocationUpdate(point: LocationUpdatePayload): void {
  ioInstance?.to('admins').emit('employee:location-update', point);
}
