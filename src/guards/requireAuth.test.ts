/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { signAccessToken } from '../modules/auth/jwt.js';
import { requireAuth } from './requireAuth.js';

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  it('attaches req.user and calls next for a valid bearer token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' });
    const req: any = {
      header: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
    };
    const res = createMockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', role: 'ADMIN' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 when no authorization header is present', () => {
    const req: any = { header: () => undefined };
    const res = createMockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 for an invalid token', () => {
    const req: any = { header: () => 'Bearer not-a-real-token' };
    const res = createMockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
