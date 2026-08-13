import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../guards/requireAuth.js';
import { loginHandler, logoutHandler, meHandler, refreshHandler } from './auth.controller.js';

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', requireAuth, logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
