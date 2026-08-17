import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export interface RosterRow {
  id: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export async function findActiveUsers(): Promise<RosterRow[]> {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.status, 'ACTIVE'));
}
