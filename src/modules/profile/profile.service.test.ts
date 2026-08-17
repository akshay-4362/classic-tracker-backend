import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./profile.repository.js', () => ({
  findUserVisibility: vi.fn(),
  updateUserVisibility: vi.fn(),
}));

import { findUserVisibility, updateUserVisibility } from './profile.repository.js';
import {
  ProfileNotFoundError,
  getLocationVisibility,
  updateLocationVisibility,
} from './profile.service.js';

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
