/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import { requireRole } from './requireRole.js';

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireRole', () => {
  it('calls next when req.user.role matches', () => {
    const req: any = { user: { id: 'user-1', role: 'ADMIN' } };
    const res = createMockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 403 when req.user.role does not match', () => {
    const req: any = { user: { id: 'user-1', role: 'EMPLOYEE' } };
    const res = createMockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when req.user is undefined', () => {
    const req: any = {};
    const res = createMockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
