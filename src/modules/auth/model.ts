import { t } from 'elysia';

export const registerBody = t.Object({
  email: t.String({ format: 'email' }),
  name: t.String({ minLength: 1, maxLength: 255 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const loginBody = t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 1 }),
  rememberMe: t.Optional(t.Boolean({ default: false })),
  deviceInfo: t.Optional(t.String({ maxLength: 512 })),
});

export const refreshBody = t.Object({
  refreshToken: t.String({ minLength: 1 }),
});

export const logoutBody = t.Object({
  refreshToken: t.String({ minLength: 1 }),
});

export const authResponse = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
});

export const userResponse = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  createdAt: t.String(),
});

export const messageResponse = t.Object({
  message: t.String(),
});
