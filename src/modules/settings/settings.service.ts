import {
  findTrackingSettings,
  updateTrackingSettingsRow,
  type TrackingSettingsRow,
} from './settings.repository.js';

export interface TrackingSettingsView {
  updateIntervalMs: number;
  distanceIntervalM: number;
}

function toView(row: TrackingSettingsRow): TrackingSettingsView {
  return { updateIntervalMs: row.updateIntervalMs, distanceIntervalM: row.distanceIntervalM };
}

export async function getTrackingSettings(): Promise<TrackingSettingsView> {
  const row = await findTrackingSettings();
  if (!row) {
    throw new Error('Tracking settings row is missing');
  }
  return toView(row);
}

export async function updateTrackingSettings(data: {
  updateIntervalMs?: number;
  distanceIntervalM?: number;
}): Promise<TrackingSettingsView> {
  const updated = await updateTrackingSettingsRow(data);
  if (!updated) {
    throw new Error('Tracking settings row is missing');
  }
  return toView(updated);
}
