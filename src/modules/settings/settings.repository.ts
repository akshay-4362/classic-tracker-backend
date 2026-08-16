import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { trackingSettings } from '../../database/schema/trackingSettings.js';

export type TrackingSettingsRow = typeof trackingSettings.$inferSelect;

export async function findTrackingSettings(): Promise<TrackingSettingsRow | null> {
  const [row] = await db.select().from(trackingSettings).limit(1);
  return row ?? null;
}

export async function updateTrackingSettingsRow(data: {
  updateIntervalMs?: number;
  distanceIntervalM?: number;
}): Promise<TrackingSettingsRow> {
  const setFields: {
    updatedAt: Date;
    updateIntervalMs?: number;
    distanceIntervalM?: number;
  } = { updatedAt: new Date() };

  if (data.updateIntervalMs !== undefined) setFields.updateIntervalMs = data.updateIntervalMs;
  if (data.distanceIntervalM !== undefined) setFields.distanceIntervalM = data.distanceIntervalM;

  const [updated] = await db
    .update(trackingSettings)
    .set(setFields)
    .where(eq(trackingSettings.id, true))
    .returning();
  return updated;
}
