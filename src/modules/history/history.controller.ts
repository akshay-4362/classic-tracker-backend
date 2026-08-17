import type { Request, Response } from 'express';
import { historyQuerySchema } from './history.dto.js';
import { getLocationHistory } from './history.service.js';

export async function getLocationHistoryHandler(req: Request, res: Response): Promise<void> {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters' });
    return;
  }

  const points = await getLocationHistory(parsed.data.employeeId, parsed.data.date);
  res.status(200).json({ points });
}
