// src/modules/auth/auth.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import argon2 from 'argon2';
import crypto from 'node:crypto';

vi.mock('./auth.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  setRefreshToken: vi.fn(),
}));

import { findUserByEmail, findUserById, setRefreshToken } from './auth.repository.js';
import { AuthError, getMe, login, logout, refresh } from './auth.service.js';
import { signRefreshToken } from './jwt.js';

const baseUser = {
  id: 'user-1',
  name: 'Alex',
  email: 'alex@example.com',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  refreshTokenHash: null as string | null,
  refreshTokenExpiresAt: null as Date | null,
};

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tokens and stores a refresh token hash for a valid password', async () => {
    const passwordHash = await argon2.hash('correct-password');
    vi.mocked(findUserByEmail).mockResolvedValue({ ...baseUser, passwordHash } as never);

    const result = await login('alex@example.com', 'correct-password');

    expect(result.user).toEqual({
      id: 'user-1',
      name: 'Alex',
      email: 'alex@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(setRefreshToken).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  it('rejects an unknown email', async () => {
    const verifySpy = vi.spyOn(argon2, 'verify');
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    await expect(login('nobody@example.com', 'whatever')).rejects.toThrow(AuthError);
    // Regression guard: argon2.verify must still run against a dummy hash so
    // an unknown email takes the same amount of time as a known one, closing
    // the timing side-channel that would otherwise let an attacker
    // distinguish "no such user" from "wrong password" by response time.
    expect(verifySpy).toHaveBeenCalled();
  });

  it('rejects a disabled user even with the correct password', async () => {
    const verifySpy = vi.spyOn(argon2, 'verify');
    const passwordHash = await argon2.hash('correct-password');
    vi.mocked(findUserByEmail).mockResolvedValue({ ...baseUser, status: 'DISABLED', passwordHash } as never);
    await expect(login('alex@example.com', 'correct-password')).rejects.toThrow(AuthError);
    // Regression guard: same timing-safety requirement as above, but for the
    // disabled-account path.
    expect(verifySpy).toHaveBeenCalled();
  });

  it('rejects the wrong password', async () => {
    const passwordHash = await argon2.hash('correct-password');
    vi.mocked(findUserByEmail).mockResolvedValue({ ...baseUser, passwordHash } as never);
    await expect(login('alex@example.com', 'wrong-password')).rejects.toThrow(AuthError);
  });
});

describe('refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rotates tokens when the provided refresh token matches the stored hash and has not expired', async () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    vi.mocked(findUserById).mockResolvedValue({
      ...baseUser,
      passwordHash: 'irrelevant',
      refreshTokenHash: hash,
      refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    } as never);

    const result = await refresh(token);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(token);
    expect(setRefreshToken).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  it('rejects an expired refresh token', async () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    vi.mocked(findUserById).mockResolvedValue({
      ...baseUser,
      passwordHash: 'irrelevant',
      refreshTokenHash: hash,
      refreshTokenExpiresAt: new Date(Date.now() - 1000),
    } as never);

    await expect(refresh(token)).rejects.toThrow(AuthError);
  });

  it('rejects a refresh token that does not match the stored hash', async () => {
    const token = signRefreshToken({ sub: 'user-1' });
    vi.mocked(findUserById).mockResolvedValue({
      ...baseUser,
      passwordHash: 'irrelevant',
      refreshTokenHash: 'some-other-hash',
      refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    } as never);

    await expect(refresh(token)).rejects.toThrow(AuthError);
  });

  it('rejects a malformed refresh token', async () => {
    await expect(refresh('not-a-real-token')).rejects.toThrow(AuthError);
  });

  it('rejects a disabled user even when the token hash matches and has not expired', async () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    vi.mocked(findUserById).mockResolvedValue({
      ...baseUser,
      status: 'DISABLED',
      passwordHash: 'irrelevant',
      refreshTokenHash: hash,
      refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    } as never);

    await expect(refresh(token)).rejects.toThrow(AuthError);
  });
});

describe('logout', () => {
  it('clears the stored refresh token', async () => {
    await logout('user-1');
    expect(setRefreshToken).toHaveBeenCalledWith('user-1', null, null);
  });
});

describe('getMe', () => {
  it('returns the public user view', async () => {
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, passwordHash: 'irrelevant' } as never);
    const result = await getMe('user-1');
    expect(result).toEqual({
      id: 'user-1',
      name: 'Alex',
      email: 'alex@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
  });

  it('throws when the user no longer exists', async () => {
    vi.mocked(findUserById).mockResolvedValue(null);
    await expect(getMe('user-1')).rejects.toThrow(AuthError);
  });

  it('throws when the user has been disabled', async () => {
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, status: 'DISABLED', passwordHash: 'irrelevant' } as never);
    await expect(getMe('user-1')).rejects.toThrow(AuthError);
  });
});
