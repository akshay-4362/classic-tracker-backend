import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./profile.service.js', () => ({
  ProfileError: class ProfileError extends Error {},
  ProfileNotFoundError: class ProfileNotFoundError extends Error {},
  getLocationVisibility: vi.fn(),
  updateLocationVisibility: vi.fn(),
}));

import { createApp } from '../../app.js';
import { getLocationVisibility, updateLocationVisibility } from './profile.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

describe('profile routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/profile/visibility', () => {
    it('returns visibility for admin', async () => {
      vi.mocked(getLocationVisibility).mockResolvedValue({ locationVisibleToEmployees: true });
      const res = await request(createApp())
        .get('/api/profile/visibility')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ locationVisibleToEmployees: true });
    });

    it('returns visibility for employee', async () => {
      vi.mocked(getLocationVisibility).mockResolvedValue({ locationVisibleToEmployees: false });
      const res = await request(createApp())
        .get('/api/profile/visibility')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/profile/visibility');
      expect(res.status).toBe(401);
      expect(getLocationVisibility).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/profile/visibility', () => {
    it('returns 200 for admin', async () => {
      vi.mocked(updateLocationVisibility).mockResolvedValue({ locationVisibleToEmployees: true });
      const res = await request(createApp())
        .put('/api/profile/visibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationVisibleToEmployees: true });
      expect(res.status).toBe(200);
      expect(updateLocationVisibility).toHaveBeenCalledWith('admin-1', true);
    });

    it('returns 403 for employee role', async () => {
      const res = await request(createApp())
        .put('/api/profile/visibility')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ locationVisibleToEmployees: true });
      expect(res.status).toBe(403);
      expect(updateLocationVisibility).not.toHaveBeenCalled();
    });

    it('returns 400 for a non-boolean body', async () => {
      const res = await request(createApp())
        .put('/api/profile/visibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationVisibleToEmployees: 'yes' });
      expect(res.status).toBe(400);
      expect(updateLocationVisibility).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp())
        .put('/api/profile/visibility')
        .send({ locationVisibleToEmployees: true });
      expect(res.status).toBe(401);
      expect(updateLocationVisibility).not.toHaveBeenCalled();
    });
  });
});
