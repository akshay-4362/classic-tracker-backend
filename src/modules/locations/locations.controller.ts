import type { Request, Response } from 'express';
import { locationBatchSchema } from './locations.dto.js';
import { getCurrentLocations, ingestLocations } from './locations.service.js';

export async function ingestLocationsHandler(req: Request, res: Response): Promise<void> {
  const parsed = locationBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const employeeId = req.user!.id;
  const result = await ingestLocations(employeeId, req.user!.role, parsed.data.points);
  res.status(201).json(result);
}

export async function getCurrentLocationsHandler(req: Request, res: Response): Promise<void> {
  const points = await getCurrentLocations(req.user!.id, req.user!.role);
  res.status(200).json({ points });
}
