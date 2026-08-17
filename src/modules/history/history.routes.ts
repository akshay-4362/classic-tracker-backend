import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { requireRole } from '../../guards/requireRole.js';
import { getLocationHistoryHandler } from './history.controller.js';

export const historyRouter = Router();

historyRouter.use(requireAuth, requireRole('ADMIN'));

historyRouter.get('/', getLocationHistoryHandler);
