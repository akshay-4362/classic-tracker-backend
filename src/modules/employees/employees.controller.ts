import type { Request, Response } from 'express';
import { createEmployeeSchema, updateEmployeeSchema } from './employees.dto.js';
import {
  EmployeeEmailConflictError,
  EmployeeNotFoundError,
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from './employees.service.js';

export async function listEmployeesHandler(_req: Request, res: Response): Promise<void> {
  const employees = await listEmployees();
  res.status(200).json({ employees });
}

export async function createEmployeeHandler(req: Request, res: Response): Promise<void> {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const employee = await createEmployee(parsed.data);
    res.status(201).json({ employee });
  } catch (error) {
    if (error instanceof EmployeeEmailConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function getEmployeeHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const employee = await getEmployee(req.params.id);
    res.status(200).json({ employee });
  } catch (error) {
    if (error instanceof EmployeeNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function updateEmployeeHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const parsed = updateEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const employee = await updateEmployee(req.params.id, parsed.data);
    res.status(200).json({ employee });
  } catch (error) {
    if (error instanceof EmployeeNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof EmployeeEmailConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
}
