import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./roster.service.js', () => ({
  listRoster: vi.fn(),
}));

import { createApp } from '../../app.js';
import { listRoster } from './roster.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const sampleRoster = [
  { id: 'admin-1', name: 'Alice', role: 'ADMIN' as const },
  { id: 'emp-1', name: 'Bob', role: 'EMPLOYEE' as const },
];

describe('GET /api/roster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the roster for an admin', async () => {
    vi.mocked(listRoster).mockResolvedValue(sampleRoster);
    const res = await request(createApp())
      .get('/api/roster')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ roster: sampleRoster });
  });

  it('returns the roster for an employee', async () => {
    vi.mocked(listRoster).mockResolvedValue(sampleRoster);
    const res = await request(createApp())
      .get('/api/roster')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ roster: sampleRoster });
  });

  it('returns 401 without auth', async () => {
    const res = await request(createApp()).get('/api/roster');
    expect(res.status).toBe(401);
    expect(listRoster).not.toHaveBeenCalled();
  });
});
