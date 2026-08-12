import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('throws when a required variable is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('parses required vars and applies defaults for optional ones', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://localhost/db',
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      CORS_ORIGIN: 'https://example.com',
    });

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOCATION_UPDATE_INTERVAL).toBe(20000);
    expect(env.LOCATION_DISTANCE_INTERVAL).toBe(20);
    expect(env.LIVE_LOCATION_TIMEOUT).toBe(60);
    expect(env.STALE_LOCATION_TIMEOUT).toBe(300);
    expect(env.OFFLINE_LOCATION_TIMEOUT).toBe(600);
  });

  it('respects explicit overrides', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgres://localhost/db',
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      CORS_ORIGIN: 'https://example.com',
    });

    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
  });
});
