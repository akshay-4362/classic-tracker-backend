// src/modules/auth/auth.routes.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('./auth.service.js', () => ({
  AuthError: class AuthError extends Error {},
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

import { createApp } from '../../app.js';
import { AuthError, getMe, login, logout, refresh } from './auth.service.js';
import { signAccessToken } from './jwt.js';

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/auth/login returns tokens and user on success', async () => {
    vi.mocked(login).mockResolvedValue({
      user: { id: 'user-1', name: 'Alex', email: 'alex@example.com', role: 'ADMIN', status: 'ACTIVE' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'alex@example.com', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('access-token');
    expect(response.body.user.email).toBe('alex@example.com');
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    vi.mocked(login).mockRejectedValue(new AuthError('Invalid email or password'));

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'alex@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('POST /api/auth/login returns 400 for a malformed body', async () => {
    const response = await request(createApp()).post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('POST /api/auth/refresh returns new tokens on success', async () => {
    vi.mocked(refresh).mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    const response = await request(createApp()).post('/api/auth/refresh').send({ refreshToken: 'old-refresh' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('new-access');
  });

  it('POST /api/auth/logout requires authentication', async () => {
    const response = await request(createApp()).post('/api/auth/logout').send();
    expect(response.status).toBe(401);
    expect(logout).not.toHaveBeenCalled();
  });

  it('POST /api/auth/logout clears the session for an authenticated user', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' });
    vi.mocked(logout).mockResolvedValue(undefined);

    const response = await request(createApp())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(logout).toHaveBeenCalledWith('user-1');
  });

  it('GET /api/auth/me returns the current user for a valid token', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' });
    vi.mocked(getMe).mockResolvedValue({
      id: 'user-1',
      name: 'Alex',
      email: 'alex@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const response = await request(createApp()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('alex@example.com');
  });

  it('GET /api/auth/me requires authentication', async () => {
    const response = await request(createApp()).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
