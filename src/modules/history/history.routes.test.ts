import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./history.service.js', () => ({
  getLocationHistory: vi.fn(),
}));

import { createApp } from '../../app.js';
import { getLocationHistory } from './history.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const samplePoints = [
  {
    latitude: 40.7128,
    longitude: -74.006,
    recordedAt: '2026-08-17T09:00:00.000Z',
    speed: null,
    batteryLevel: null,
  },
];

describe('GET /api/history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with the points for admin', async () => {
    vi.mocked(getLocationHistory).mockResolvedValue(samplePoints);
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-08-17' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ points: samplePoints });
    expect(getLocationHistory).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '2026-08-17'
    );
  });

  it('returns 403 for employee role', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-08-17' })
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-08-17' });
    expect(res.status).toBe(401);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid employeeId', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: 'not-a-uuid', date: '2026-08-17' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed date', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '08/17/2026' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for a shape-valid but out-of-range date (month 13)', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-13-01' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for a shape-valid but out-of-range date (day 32)', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-08-32' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for an impossible-but-in-range date that JS would silently roll over (Feb 30)', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-02-30' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });

  it('returns 400 for another impossible-but-in-range date (Apr 31)', async () => {
    const res = await request(createApp())
      .get('/api/history')
      .query({ employeeId: '11111111-1111-4111-8111-111111111111', date: '2026-04-31' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(getLocationHistory).not.toHaveBeenCalled();
  });
});
