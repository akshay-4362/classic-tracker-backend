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

  it('accepts a full-precision 500-point batch under the raised body size limit', async () => {
    vi.mocked(ingestLocations).mockResolvedValue({ inserted: 500 });
    // Mirrors realistic expo-location output: full-precision floats on every
    // field, not the truncated fixtures used elsewhere in this file. This is
    // what actually exercises payload size — a 500-point batch of these is
    // ~126KB, comfortably inside the 1mb express.json() limit but well over
    // the 100KB default, which is exactly the regression this test guards.
    const fullPrecisionBatch = Array.from({ length: 500 }, (_, i) => ({
      latitude: 40.71277612345678 + i * 0.00000123456789,
      longitude: -74.00597423456789 - i * 0.00000123456789,
      accuracy: 12.45678901234567,
      altitude: 987.6543210987654,
      speed: 3.210987654321098,
      heading: 271.8459045235601,
      batteryLevel: 0.8734567891234567,
      recordedAt: new Date(Date.parse('2026-08-17T12:00:00.000Z') + i * 20_000).toISOString(),
    }));

    const res = await request(createApp())
      .post('/api/locations/batch')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ points: fullPrecisionBatch });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 500 });
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
