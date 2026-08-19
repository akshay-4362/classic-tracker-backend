import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUse = vi.fn();
const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit }));

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(function () {
    return {
      use: mockUse,
      on: mockOn,
      emit: mockEmit,
      to: mockTo,
    };
  }),
}));

import { Server } from 'socket.io';
import {
  attachSocketServer,
  broadcastLocationUpdate,
  socketAuthMiddleware,
} from './socket.js';
import { signAccessToken } from '../auth/jwt.js';

describe('attachSocketServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the Socket.IO server with CORS config and registers the auth middleware', () => {
    const fakeHttpServer = {} as never;

    attachSocketServer(fakeHttpServer);

    expect(Server).toHaveBeenCalledWith(
      fakeHttpServer,
      expect.objectContaining({ cors: expect.any(Object) })
    );
    expect(mockUse).toHaveBeenCalledWith(socketAuthMiddleware);
  });

  it('joins each connecting socket to its user and role rooms', () => {
    attachSocketServer({} as never);

    const connectionHandler = mockOn.mock.calls.find(([event]) => event === 'connection')?.[1];
    const mockJoin = vi.fn();
    connectionHandler({ data: { user: { id: 'emp-1', role: 'EMPLOYEE' } }, join: mockJoin });

    expect(mockJoin).toHaveBeenCalledWith('user:emp-1');
    expect(mockJoin).toHaveBeenCalledWith('role:EMPLOYEE');
  });
});

describe('socketAuthMiddleware', () => {
  it('calls next with an error when no token is present', () => {
    const next = vi.fn();

    socketAuthMiddleware({ handshake: { auth: {} }, data: {} } as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next() with no error and sets socket.data.user for a valid EMPLOYEE token', () => {
    const token = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });
    const next = vi.fn();
    const socket = { handshake: { auth: { token } }, data: {} as { user?: unknown } };

    socketAuthMiddleware(socket as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ id: 'emp-1', role: 'EMPLOYEE' });
  });

  it('calls next() with no error and sets socket.data.user for a valid ADMIN token', () => {
    const token = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
    const next = vi.fn();
    const socket = { handshake: { auth: { token } }, data: {} as { user?: unknown } };

    socketAuthMiddleware(socket as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ id: 'admin-1', role: 'ADMIN' });
  });

  it('calls next with an error for an invalid token', () => {
    const next = vi.fn();

    socketAuthMiddleware(
      { handshake: { auth: { token: 'garbage' } }, data: {} } as never,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('broadcastLocationUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits the point to only the given rooms after the server is attached', () => {
    attachSocketServer({} as never);
    const point = {
      employeeId: 'emp-1',
      latitude: 40.7128,
      longitude: -74.006,
      updatedAt: '2026-08-17T12:00:00.000Z',
    };

    broadcastLocationUpdate(point, ['user:emp-1', 'role:ADMIN']);

    expect(mockTo).toHaveBeenCalledWith(['user:emp-1', 'role:ADMIN']);
    expect(mockEmit).toHaveBeenCalledWith('employee:location-update', point);
  });
});
