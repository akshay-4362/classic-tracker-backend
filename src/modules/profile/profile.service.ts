import argon2 from 'argon2';
import {
  findUserById,
  findUserVisibility,
  updateProfileFields,
  updateUserVisibility,
  type UserRow,
} from './profile.repository.js';

export class ProfileError extends Error {}
export class ProfileNotFoundError extends ProfileError {}
export class ProfileCurrentPasswordError extends ProfileError {}

export interface VisibilityView {
  locationVisibleToEmployees: boolean;
}

export interface ProfileView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'EMPLOYEE';
}

function toProfileView(row: UserRow): ProfileView {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone ?? null, role: row.role };
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

export async function getMyProfile(userId: string): Promise<ProfileView> {
  const row = await findUserById(userId);
  if (!row) {
    throw new ProfileNotFoundError('User not found');
  }
  return toProfileView(row);
}

export async function updateMyProfile(
  userId: string,
  data: {
    name?: string;
    phone?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<ProfileView> {
  const updateData: {
    name?: string;
    phone?: string | null;
    passwordHash?: string;
    refreshTokenHash?: null;
    refreshTokenExpiresAt?: null;
  } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if ('phone' in data) updateData.phone = data.phone;

  if (data.newPassword) {
    const existing = await findUserById(userId);
    if (!existing) {
      throw new ProfileNotFoundError('User not found');
    }
    const isValid = await argon2.verify(existing.passwordHash, data.currentPassword ?? '');
    if (!isValid) {
      throw new ProfileCurrentPasswordError('Current password is incorrect');
    }
    updateData.passwordHash = await argon2.hash(data.newPassword);
    updateData.refreshTokenHash = null;
    updateData.refreshTokenExpiresAt = null;
  }

  const updated = await updateProfileFields(userId, updateData);
  if (!updated) {
    throw new ProfileNotFoundError('User not found');
  }
  return toProfileView(updated);
}
