import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  LOCATION_UPDATE_INTERVAL: z.coerce.number().default(20000),
  LOCATION_DISTANCE_INTERVAL: z.coerce.number().default(20),
  LIVE_LOCATION_TIMEOUT: z.coerce.number().default(60),
  STALE_LOCATION_TIMEOUT: z.coerce.number().default(300),
  OFFLINE_LOCATION_TIMEOUT: z.coerce.number().default(600),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return result.data;
}

export const env = loadEnv();
