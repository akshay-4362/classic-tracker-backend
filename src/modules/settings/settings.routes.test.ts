import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./settings.service.js', () => ({
  getTrackingSettings: vi.fn(),
  updateTrackingSettings: vi.fn(),
}));

import { createApp } from '../../app.js';
import { getTrackingSettings, updateTrackingSettings } from './settings.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const sampleSettings = { updateIntervalMs: 20000, distanceIntervalM: 20 };

describe('settings routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/settings/tracking', () => {
    it('returns settings for admin', async () => {
      vi.mocked(getTrackingSettings).mockResolvedValue(sampleSettings);
      const res = await request(createApp())
        .get('/api/settings/tracking')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleSettings);
    });

    it('returns settings for employee', async () => {
      vi.mocked(getTrackingSettings).mockResolvedValue(sampleSettings);
      const res = await request(createApp())
        .get('/api/settings/tracking')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleSettings);
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/settings/tracking');
      expect(res.status).toBe(401);
      expect(getTrackingSettings).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/settings/tracking', () => {
    it('returns 200 with updated settings for admin', async () => {
      vi.mocked(updateTrackingSettings).mockResolvedValue({
        updateIntervalMs: 10000,
        distanceIntervalM: 20,
      });
      const res = await request(createApp())
        .put('/api/settings/tracking')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ updateIntervalMs: 10000 });
      expect(res.status).toBe(200);
      expect(res.body.updateIntervalMs).toBe(10000);
    });

    it('returns 403 for employee role', async () => {
      const res = await request(createApp())
        .put('/api/settings/tracking')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ updateIntervalMs: 10000 });
      expect(res.status).toBe(403);
      expect(updateTrackingSettings).not.toHaveBeenCalled();
    });

    it('returns 400 for an empty body', async () => {
      const res = await request(createApp())
        .put('/api/settings/tracking')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(updateTrackingSettings).not.toHaveBeenCalled();
    });

    it('returns 400 for an out-of-bounds value', async () => {
      const res = await request(createApp())
        .put('/api/settings/tracking')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ updateIntervalMs: 1000 });
      expect(res.status).toBe(400);
      expect(updateTrackingSettings).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp())
        .put('/api/settings/tracking')
        .send({ updateIntervalMs: 10000 });
      expect(res.status).toBe(401);
      expect(updateTrackingSettings).not.toHaveBeenCalled();
    });
  });
});
