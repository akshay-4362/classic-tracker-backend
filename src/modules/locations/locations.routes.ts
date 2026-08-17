import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { ingestLocationsHandler } from './locations.controller.js';

export const locationsRouter = Router();

locationsRouter.use(requireAuth);

locationsRouter.post('/batch', ingestLocationsHandler);
