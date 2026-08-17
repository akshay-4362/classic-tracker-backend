import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { employeesRouter } from './modules/employees/employees.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { locationsRouter } from './modules/locations/locations.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { rosterRouter } from './modules/roster/roster.routes.js';
import { historyRouter } from './modules/history/history.routes.js';

export function createApp() {
  const app = express();

  // Render sits in front of this service as a single reverse proxy hop, so
  // req.ip must be derived from the (trusted) X-Forwarded-For header rather
  // than the socket address. This also silences express-rate-limit's
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR validation warning.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));

  // Health checks must never be subject to the request budget below, so
  // register /health before the rate limiter (but still behind helmet/cors).
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  // Default body-parser limit (100KB) is too small for a full 500-point
  // location batch with realistic full-precision GPS floats (~126KB), which
  // would otherwise 413 forever for any device whose local queue fills up
  // while offline. Give it real headroom above the locationBatchSchema cap.
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/roster', rosterRouter);
  app.use('/api/history', historyRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
