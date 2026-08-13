import { doublePrecision, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { geographyPoint } from './geography.js';
import { users } from './users.js';

export const locationHistory = pgTable(
  'location_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    location: geographyPoint('location').notNull(),
    accuracy: doublePrecision('accuracy'),
    altitude: doublePrecision('altitude'),
    speed: doublePrecision('speed'),
    heading: doublePrecision('heading'),
    batteryLevel: doublePrecision('battery_level'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index('location_history_employee_id_idx').on(table.employeeId),
    recordedAtIdx: index('location_history_recorded_at_idx').on(table.recordedAt),
    employeeRecordedIdx: index('location_history_employee_recorded_idx').on(
      table.employeeId,
      table.recordedAt
    ),
  })
);
