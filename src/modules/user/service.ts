import { eq } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { users } from '../../db/schema/users.ts';
import { hashPassword, verifyPassword } from '../../utils/hash.ts';
import { NotFoundError, UnauthorizedError } from '../../common/errors.ts';

export async function updateUser(userId: string, data: { name?: string }) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    });

  if (!updatedUser) throw new NotFoundError('User');

  return updatedUser;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new NotFoundError('User');

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
