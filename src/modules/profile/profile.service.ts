import { findUserVisibility, updateUserVisibility } from './profile.repository.js';

export class ProfileError extends Error {}
export class ProfileNotFoundError extends ProfileError {}

export interface VisibilityView {
  locationVisibleToEmployees: boolean;
}

export async function getLocationVisibility(userId: string): Promise<VisibilityView> {
  const visible = await findUserVisibility(userId);
  if (visible === null) {
    throw new ProfileNotFoundError('User not found');
  }
  return { locationVisibleToEmployees: visible };
}

export async function updateLocationVisibility(
  userId: string,
  visible: boolean
): Promise<VisibilityView> {
  const updated = await updateUserVisibility(userId, visible);
  if (updated === null) {
    throw new ProfileNotFoundError('User not found');
  }
  return { locationVisibleToEmployees: updated };
}
