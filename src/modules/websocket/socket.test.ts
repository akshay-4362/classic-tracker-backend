import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUse = vi.fn();
const mockOn = vi.fn();
const mockTo = vi.fn();
const mockEmit = vi.fn();

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(function () {
    return {
      use: mockUse,
      on: mockOn,
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
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  it('creates the Socket.IO server with CORS config and registers the auth middleware', () => {
    const fakeHttpServer = {} as never;

    attachSocketServer(fakeHttpServer);

    expect(Server).toHaveBeenCalledWith(
      fakeHttpServer,
      expect.objectContaining({ cors: expect.any(Object) })
    );
    expect(mockUse).toHaveBeenCalledWith(socketAuthMiddleware);
    expect(mockOn).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('joins a connecting socket to the admins room', () => {
    attachSocketServer({} as never);
    const connectionHandler = mockOn.mock.calls.find((call) => call[0] === 'connection')![1];
    const join = vi.fn();

    connectionHandler({ join });

    expect(join).toHaveBeenCalledWith('admins');
  });
});

describe('socketAuthMiddleware', () => {
  it('calls next with an error when no token is present', () => {
    const next = vi.fn();

    socketAuthMiddleware({ handshake: { auth: {} }, data: {} } as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with an error for a non-ADMIN token', () => {
    const token = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });
    const next = vi.fn();

    socketAuthMiddleware({ handshake: { auth: { token } }, data: {} } as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
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
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  it('emits the point to the admins room after the server is attached', () => {
    attachSocketServer({} as never);
    const point = {
      employeeId: 'emp-1',
      latitude: 40.7128,
      longitude: -74.006,
      updatedAt: '2026-08-17T12:00:00.000Z',
    };

    broadcastLocationUpdate(point);

    expect(mockTo).toHaveBeenCalledWith('admins');
    expect(mockEmit).toHaveBeenCalledWith('employee:location-update', point);
  });
});
