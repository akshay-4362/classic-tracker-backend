import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./locations.service.js', () => ({
  ingestLocations: vi.fn(),
}));

import { createApp } from '../../app.js';
import { ingestLocations } from './locations.service.js';
import { signAccessToken } from '../auth/jwt.js';

const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const point = {
  latitude: 40.7128,
  longitude: -74.006,
  recordedAt: '2026-08-17T12:00:00.000Z',
};

describe('POST /api/locations/batch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 201 with inserted count', async () => {
    vi.mocked(ingestLocations).mockResolvedValue({ inserted: 1 });
    const res = await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ points: [point] });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 1 });
    expect(ingestLocations).toHaveBeenCalledWith('emp-1', [point]);
  });

  it('returns 400 for an empty points array', async () => {
    const res = await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ points: [] });
    expect(res.status).toBe(400);
    expect(ingestLocations).not.toHaveBeenCalled();
  });

  it('returns 400 for a batch over 500 points', async () => {
    const bigBatch = Array.from({ length: 501 }, () => point);
    const res = await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ points: bigBatch });
    expect(res.status).toBe(400);
    expect(ingestLocations).not.toHaveBeenCalled();
  });

  it('returns 400 for an out-of-range latitude', async () => {
    const res = await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ points: [{ ...point, latitude: 200 }] });
    expect(res.status).toBe(400);
    expect(ingestLocations).not.toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await request(createApp())
      .post('/api/locations/batch')
      .send({ points: [point] });
    expect(res.status).toBe(401);
    expect(ingestLocations).not.toHaveBeenCalled();
  });

  it('derives employeeId from the token, not the request body', async () => {
    vi.mocked(ingestLocations).mockResolvedValue({ inserted: 1 });
    const otherToken = signAccessToken({ sub: 'emp-2', role: 'EMPLOYEE' });
    await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ points: [point] });
    expect(ingestLocations).toHaveBeenCalledWith('emp-2', [point]);
  });
});
