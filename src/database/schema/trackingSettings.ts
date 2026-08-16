import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const trackingSettings = pgTable('tracking_settings', {
  id: boolean('id').primaryKey().default(true),
  updateIntervalMs: integer('update_interval_ms').notNull().default(20000),
  distanceIntervalM: integer('distance_interval_m').notNull().default(20),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
