import type { Request, Response } from 'express';
import { updateLocationVisibilitySchema, updateProfileSchema } from './profile.dto.js';
import {
  ProfileCurrentPasswordError,
  ProfileNotFoundError,
  getLocationVisibility,
  getMyProfile,
  updateLocationVisibility,
  updateMyProfile,
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

export async function getMyProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const profile = await getMyProfile(req.user!.id);
    res.status(200).json(profile);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function updateMyProfileHandler(req: Request, res: Response): Promise<void> {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const profile = await updateMyProfile(req.user!.id, parsed.data);
    res.status(200).json(profile);
  } catch (error) {
    if (error instanceof ProfileCurrentPasswordError) {
      res.status(401).json({ error: error.message });
      return;
    }
    if (error instanceof ProfileNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}
