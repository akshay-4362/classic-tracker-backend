import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export async function findUserVisibility(userId: string): Promise<boolean | null> {
  const [row] = await db
    .select({ locationVisibleToEmployees: users.locationVisibleToEmployees })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ? row.locationVisibleToEmployees : null;
}

export async function updateUserVisibility(
  userId: string,
  visible: boolean
): Promise<boolean | null> {
  const [updated] = await db
    .update(users)
    .set({ locationVisibleToEmployees: visible, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ locationVisibleToEmployees: users.locationVisibleToEmployees });
  return updated ? updated.locationVisibleToEmployees : null;
}
