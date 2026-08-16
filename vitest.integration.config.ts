import { defineConfig } from 'vitest/config';

// Separate config for tests that hit a real, shared database (see the
// `*.integration.test.ts` naming convention). These are excluded from the
// default `vitest.config.ts` run and only execute via `npm run
// test:integration`, which points at this config explicitly.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    env: {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
