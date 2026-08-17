import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { listRosterHandler } from './roster.controller.js';

export const rosterRouter = Router();

rosterRouter.use(requireAuth);

rosterRouter.get('/', listRosterHandler);
