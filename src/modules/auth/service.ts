import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../common/database.ts';
import { users } from '../../db/schema/users.ts';
import { refreshTokens } from '../../db/schema/refresh-tokens.ts';
import { categories } from '../../db/schema/categories.ts';
import { hashPassword, verifyPassword, hashToken } from '../../utils/hash.ts';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
} from '../../utils/jwt.ts';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../common/errors.ts';
import { DEFAULT_CATEGORIES } from '../../common/default-categories.ts';

export async function register(data: {
  email: string;
  name: string;
  password: string;
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  });

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    });

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId: user!.id,
    })),
  );

  return user!;
}

export async function login(data: {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
}) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const rememberMe = data.rememberMe ?? false;

  const accessToken = await generateAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
  });
  const refreshToken = await generateRefreshToken(user.id, rememberMe);

  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshTokenExpiresAt(rememberMe);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    deviceInfo: data.deviceInfo ?? null,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function refresh(token: string) {
  const payload = await verifyRefreshToken(token);
  if (!payload) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(token);

  const stored = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.tokenHash, tokenHash),
      gt(refreshTokens.expiresAt, new Date()),
    ),
  });

  if (!stored) {
    throw new UnauthorizedError('Refresh token not found or expired');
  }

  // Token rotation: delete old token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const user = await db.query.users.findFirst({
    where: eq(users.id, stored.userId),
  });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accessToken = await generateAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
  });
  const newRefreshToken = await generateRefreshToken(stored.userId);
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  await db.insert(refreshTokens).values({
    userId: stored.userId,
    tokenHash: newTokenHash,
    deviceInfo: stored.deviceInfo,
    expiresAt,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  const tokenHash = hashToken(token);

  const deleted = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .returning();

  if (deleted.length === 0) {
    throw new NotFoundError('Refresh token');
  }
}

export async function getMe(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}
