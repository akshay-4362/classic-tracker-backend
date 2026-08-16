import { Router } from 'express';
import { requireAuth } from '../../guards/requireAuth.js';
import { requireRole } from '../../guards/requireRole.js';
import {
  createEmployeeHandler,
  getEmployeeHandler,
  listEmployeesHandler,
  updateEmployeeHandler,
} from './employees.controller.js';

export const employeesRouter = Router();

employeesRouter.use(requireAuth, requireRole('ADMIN'));

employeesRouter.get('/', listEmployeesHandler);
employeesRouter.post('/', createEmployeeHandler);
employeesRouter.get('/:id', getEmployeeHandler);
employeesRouter.put('/:id', updateEmployeeHandler);
