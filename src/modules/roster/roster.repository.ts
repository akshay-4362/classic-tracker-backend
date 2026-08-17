import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export type RosterRow = typeof users.$inferSelect;

export async function findActiveUsers(): Promise<RosterRow[]> {
  return db.select().from(users).where(eq(users.status, 'ACTIVE'));
}
