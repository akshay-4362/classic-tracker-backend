import type { Request, Response } from 'express';
import { listRoster } from './roster.service.js';

export async function listRosterHandler(_req: Request, res: Response): Promise<void> {
  const roster = await listRoster();
  res.status(200).json({ roster });
}
