import type { Request, Response } from 'express';
import { updateTrackingSettingsSchema } from './settings.dto.js';
import { getTrackingSettings, updateTrackingSettings } from './settings.service.js';

export async function getTrackingSettingsHandler(_req: Request, res: Response): Promise<void> {
  const settings = await getTrackingSettings();
  res.status(200).json(settings);
}

export async function updateTrackingSettingsHandler(req: Request, res: Response): Promise<void> {
  const parsed = updateTrackingSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const settings = await updateTrackingSettings(parsed.data);
  res.status(200).json(settings);
}
