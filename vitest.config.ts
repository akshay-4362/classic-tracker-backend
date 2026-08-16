import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/*.integration.test.ts',
    ],
    env: {
      DATABASE_URL: 'postgres://localhost/db',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
