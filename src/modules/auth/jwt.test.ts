import { describe, expect, it } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt.js';

describe('jwt helpers', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('ADMIN');
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-1');
  });

  it('rejects an access token verified with the refresh secret', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'ADMIN' });
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it('rejects a refresh token verified with the access secret', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
