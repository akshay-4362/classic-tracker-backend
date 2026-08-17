import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { requireRole } from '../../guards/requireRole.js';
import {
  getLocationVisibilityHandler,
  getMyProfileHandler,
  updateLocationVisibilityHandler,
  updateMyProfileHandler,
} from './profile.controller.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/visibility', getLocationVisibilityHandler);
profileRouter.put('/visibility', requireRole('ADMIN'), updateLocationVisibilityHandler);
profileRouter.get('/me', getMyProfileHandler);
profileRouter.put('/me', updateMyProfileHandler);
