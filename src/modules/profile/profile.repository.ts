import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export type UserRow = typeof users.$inferSelect;

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

export async function findUserById(userId: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function updateProfileFields(
  userId: string,
  data: {
    name?: string;
    phone?: string | null;
    passwordHash?: string;
    refreshTokenHash?: null;
    refreshTokenExpiresAt?: null;
  }
): Promise<UserRow | null> {
  const setFields: {
    updatedAt: Date;
    name?: string;
    phone?: string | null;
    passwordHash?: string;
    refreshTokenHash?: null;
    refreshTokenExpiresAt?: null;
  } = { updatedAt: new Date() };

  if (data.name !== undefined) setFields.name = data.name;
  if ('phone' in data) setFields.phone = data.phone;
  if (data.passwordHash !== undefined) setFields.passwordHash = data.passwordHash;
  if ('refreshTokenHash' in data) setFields.refreshTokenHash = data.refreshTokenHash;
  if ('refreshTokenExpiresAt' in data) setFields.refreshTokenExpiresAt = data.refreshTokenExpiresAt;

  const [updated] = await db
    .update(users)
    .set(setFields)
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}
