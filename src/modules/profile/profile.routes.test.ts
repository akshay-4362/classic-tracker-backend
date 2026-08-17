import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./profile.service.js', () => ({
  ProfileError: class ProfileError extends Error {},
  ProfileNotFoundError: class ProfileNotFoundError extends Error {},
  ProfileCurrentPasswordError: class ProfileCurrentPasswordError extends Error {},
  getLocationVisibility: vi.fn(),
  updateLocationVisibility: vi.fn(),
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));

import { createApp } from '../../app.js';
import {
  ProfileCurrentPasswordError,
  ProfileNotFoundError,
  getLocationVisibility,
  getMyProfile,
  updateLocationVisibility,
  updateMyProfile,
} from './profile.service.js';
import { signAccessToken } from '../auth/jwt.js';

const adminToken = signAccessToken({ sub: 'admin-1', role: 'ADMIN' });
const employeeToken = signAccessToken({ sub: 'emp-1', role: 'EMPLOYEE' });

const sampleProfile = {
  id: 'emp-1',
  name: 'Bob',
  email: 'bob@example.com',
  phone: null,
  role: 'EMPLOYEE' as const,
};

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

  describe('GET /api/profile/me', () => {
    it('returns the profile for an authenticated employee', async () => {
      vi.mocked(getMyProfile).mockResolvedValue(sampleProfile);
      const res = await request(createApp())
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleProfile);
      expect(getMyProfile).toHaveBeenCalledWith('emp-1');
    });

    it('returns the profile for an authenticated admin', async () => {
      vi.mocked(getMyProfile).mockResolvedValue({
        ...sampleProfile,
        id: 'admin-1',
        role: 'ADMIN' as const,
      });
      const res = await request(createApp())
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(getMyProfile).toHaveBeenCalledWith('admin-1');
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/profile/me');
      expect(res.status).toBe(401);
      expect(getMyProfile).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/profile/me', () => {
    it('returns 200 with the updated profile', async () => {
      vi.mocked(updateMyProfile).mockResolvedValue({ ...sampleProfile, name: 'Robert' });
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Robert', role: 'ADMIN', email: 'evil@x.com' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Robert');
      expect(updateMyProfile).toHaveBeenCalledWith('emp-1', { name: 'Robert' });
    });

    it('returns 401 for a wrong current password', async () => {
      vi.mocked(updateMyProfile).mockRejectedValue(
        new ProfileCurrentPasswordError('Current password is incorrect')
      );
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ currentPassword: 'wrong', newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Current password is incorrect');
    });

    it('returns 400 for an empty body', async () => {
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(updateMyProfile).not.toHaveBeenCalled();
    });

    it('returns 400 for newPassword without currentPassword', async () => {
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ newPassword: 'newpassword123' });
      expect(res.status).toBe(400);
      expect(updateMyProfile).not.toHaveBeenCalled();
    });

    it('returns 400 for a newPassword shorter than 8 characters', async () => {
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ currentPassword: 'old', newPassword: 'short' });
      expect(res.status).toBe(400);
      expect(updateMyProfile).not.toHaveBeenCalled();
    });

    it('returns 404 when the user is not found', async () => {
      vi.mocked(updateMyProfile).mockRejectedValue(new ProfileNotFoundError('User not found'));
      const res = await request(createApp())
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Robert' });
      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).put('/api/profile/me').send({ name: 'Robert' });
      expect(res.status).toBe(401);
      expect(updateMyProfile).not.toHaveBeenCalled();
    });
  });
});
