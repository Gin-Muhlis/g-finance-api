import { t } from 'elysia';

export const updateUserBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
});

export const changePasswordBody = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
});
