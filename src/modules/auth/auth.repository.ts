import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';

export type UserRow = typeof users.$inferSelect;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function setRefreshToken(
  userId: string,
  hash: string | null,
  expiresAt: Date | null
): Promise<void> {
  await db
    .update(users)
    .set({ refreshTokenHash: hash, refreshTokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
