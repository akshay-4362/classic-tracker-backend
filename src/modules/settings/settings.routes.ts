import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { requireRole } from '../../guards/requireRole.js';
import {
  getTrackingSettingsHandler,
  updateTrackingSettingsHandler,
} from './settings.controller.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/tracking', getTrackingSettingsHandler);
settingsRouter.put('/tracking', requireRole('ADMIN'), updateTrackingSettingsHandler);
