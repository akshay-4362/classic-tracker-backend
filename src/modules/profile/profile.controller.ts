import type { Request, Response } from 'express';
import { updateLocationVisibilitySchema } from './profile.dto.js';
import {
  ProfileNotFoundError,
  getLocationVisibility,
  updateLocationVisibility,
} from './profile.service.js';

export async function getLocationVisibilityHandler(req: Request, res: Response): Promise<void> {
  try {
    const visibility = await getLocationVisibility(req.user!.id);
    res.status(200).json(visibility);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function updateLocationVisibilityHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = updateLocationVisibilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const visibility = await updateLocationVisibility(
      req.user!.id,
      parsed.data.locationVisibleToEmployees
    );
    res.status(200).json(visibility);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}
