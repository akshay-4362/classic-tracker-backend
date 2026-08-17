import { beforeEach, describe, expect, it, vi } from 'vitest';
import argon2 from 'argon2';

vi.mock('./profile.repository.js', () => ({
  findUserVisibility: vi.fn(),
  updateUserVisibility: vi.fn(),
  findUserById: vi.fn(),
  updateProfileFields: vi.fn(),
}));

import {
  findUserById,
  findUserVisibility,
  updateProfileFields,
  updateUserVisibility,
} from './profile.repository.js';
import {
  ProfileCurrentPasswordError,
  ProfileNotFoundError,
  getLocationVisibility,
  getMyProfile,
  updateLocationVisibility,
  updateMyProfile,
} from './profile.service.js';

const baseRow = {
  id: 'user-1',
  name: 'Bob',
  email: 'bob@example.com',
  phone: null as string | null,
  passwordHash: '',
  role: 'EMPLOYEE' as const,
  status: 'ACTIVE' as const,
  locationVisibleToEmployees: false,
  refreshTokenHash: null as string | null,
  refreshTokenExpiresAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getLocationVisibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the current visibility', async () => {
    vi.mocked(findUserVisibility).mockResolvedValue(true);

    const result = await getLocationVisibility('admin-1');

    expect(result).toEqual({ locationVisibleToEmployees: true });
  });

  it('throws ProfileNotFoundError when the user does not exist', async () => {
    vi.mocked(findUserVisibility).mockResolvedValue(null);

    await expect(getLocationVisibility('admin-1')).rejects.toThrow(ProfileNotFoundError);
  });
});

describe('updateLocationVisibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the new visibility', async () => {
    vi.mocked(updateUserVisibility).mockResolvedValue(false);

    const result = await updateLocationVisibility('admin-1', false);

    expect(result).toEqual({ locationVisibleToEmployees: false });
    expect(updateUserVisibility).toHaveBeenCalledWith('admin-1', false);
  });

  it('throws ProfileNotFoundError when the user does not exist', async () => {
    vi.mocked(updateUserVisibility).mockResolvedValue(null);

    await expect(updateLocationVisibility('admin-1', true)).rejects.toThrow(
      ProfileNotFoundError
    );
  });
});

describe('getMyProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the profile view', async () => {
    vi.mocked(findUserById).mockResolvedValue(baseRow);

    const result = await getMyProfile('user-1');

    expect(result).toEqual({
      id: 'user-1',
      name: 'Bob',
      email: 'bob@example.com',
      phone: null,
      role: 'EMPLOYEE',
    });
  });

  it('throws ProfileNotFoundError when the user does not exist', async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(getMyProfile('user-1')).rejects.toThrow(ProfileNotFoundError);
  });
});

describe('updateMyProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the name only', async () => {
    vi.mocked(findUserById).mockResolvedValue(baseRow);
    vi.mocked(updateProfileFields).mockResolvedValue({ ...baseRow, name: 'Robert' });

    const result = await updateMyProfile('user-1', { name: 'Robert' });

    expect(result.name).toBe('Robert');
    const updateCall = vi.mocked(updateProfileFields).mock.calls[0][1];
    expect(updateCall).toEqual({ name: 'Robert' });
  });

  it('updates the phone only, including clearing it to null', async () => {
    vi.mocked(findUserById).mockResolvedValue(baseRow);
    vi.mocked(updateProfileFields).mockResolvedValue({ ...baseRow, phone: null });

    await updateMyProfile('user-1', { phone: null });

    const updateCall = vi.mocked(updateProfileFields).mock.calls[0][1];
    expect(updateCall).toEqual({ phone: null });
  });

  it('changes the password when currentPassword matches, hashing the new one', async () => {
    const currentHash = await argon2.hash('oldpassword123');
    vi.mocked(findUserById).mockResolvedValue({ ...baseRow, passwordHash: currentHash });
    vi.mocked(updateProfileFields).mockResolvedValue(baseRow);

    await updateMyProfile('user-1', {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword456',
    });

    const updateCall = vi.mocked(updateProfileFields).mock.calls[0][1];
    expect(updateCall.passwordHash).toBeDefined();
    expect(await argon2.verify(updateCall.passwordHash!, 'newpassword456')).toBe(true);
  });

  it('throws ProfileCurrentPasswordError when currentPassword is wrong', async () => {
    const currentHash = await argon2.hash('oldpassword123');
    vi.mocked(findUserById).mockResolvedValue({ ...baseRow, passwordHash: currentHash });

    await expect(
      updateMyProfile('user-1', { currentPassword: 'wrongpassword', newPassword: 'newpassword456' })
    ).rejects.toThrow(ProfileCurrentPasswordError);
    expect(updateProfileFields).not.toHaveBeenCalled();
  });

  it('throws ProfileNotFoundError when the user does not exist', async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(updateMyProfile('user-1', { name: 'Robert' })).rejects.toThrow(
      ProfileNotFoundError
    );
  });
});
