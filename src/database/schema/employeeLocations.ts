import { boolean, doublePrecision, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { geographyPoint } from './geography.js';
import { users } from './users.js';

export const employeeLocations = pgTable('employee_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  location: geographyPoint('location').notNull(),
  accuracy: doublePrecision('accuracy'),
  altitude: doublePrecision('altitude'),
  speed: doublePrecision('speed'),
  heading: doublePrecision('heading'),
  batteryLevel: doublePrecision('battery_level'),
  isTracking: boolean('is_tracking').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
