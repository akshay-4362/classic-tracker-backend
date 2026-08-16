import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./settings.repository.js', () => ({
  findTrackingSettings: vi.fn(),
  updateTrackingSettingsRow: vi.fn(),
}));

import {
  findTrackingSettings,
  updateTrackingSettingsRow,
} from './settings.repository.js';
import { getTrackingSettings, updateTrackingSettings } from './settings.service.js';

const baseRow = {
  id: true as const,
  updateIntervalMs: 20000,
  distanceIntervalM: 20,
  updatedAt: new Date(),
};

describe('getTrackingSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the current settings', async () => {
    vi.mocked(findTrackingSettings).mockResolvedValue(baseRow);

    const result = await getTrackingSettings();

    expect(result).toEqual({ updateIntervalMs: 20000, distanceIntervalM: 20 });
  });

  it('throws if the singleton row is missing', async () => {
    vi.mocked(findTrackingSettings).mockResolvedValue(null);

    await expect(getTrackingSettings()).rejects.toThrow(/tracking settings/i);
  });
});

describe('updateTrackingSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates only updateIntervalMs when only that field is given', async () => {
    vi.mocked(updateTrackingSettingsRow).mockResolvedValue({
      ...baseRow,
      updateIntervalMs: 10000,
    });

    const result = await updateTrackingSettings({ updateIntervalMs: 10000 });

    expect(result).toEqual({ updateIntervalMs: 10000, distanceIntervalM: 20 });
    expect(updateTrackingSettingsRow).toHaveBeenCalledWith({ updateIntervalMs: 10000 });
  });

  it('updates only distanceIntervalM when only that field is given', async () => {
    vi.mocked(updateTrackingSettingsRow).mockResolvedValue({
      ...baseRow,
      distanceIntervalM: 50,
    });

    const result = await updateTrackingSettings({ distanceIntervalM: 50 });

    expect(result).toEqual({ updateIntervalMs: 20000, distanceIntervalM: 50 });
    expect(updateTrackingSettingsRow).toHaveBeenCalledWith({ distanceIntervalM: 50 });
  });

  it('updates both fields when both are given', async () => {
    vi.mocked(updateTrackingSettingsRow).mockResolvedValue({
      ...baseRow,
      updateIntervalMs: 15000,
      distanceIntervalM: 100,
    });

    const result = await updateTrackingSettings({
      updateIntervalMs: 15000,
      distanceIntervalM: 100,
    });

    expect(result).toEqual({ updateIntervalMs: 15000, distanceIntervalM: 100 });
  });
});
