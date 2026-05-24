import Elysia from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import { rateLimitChangePassword } from '../../common/middleware/rate-limit.ts';
import { updateUserBody, changePasswordBody } from './model.ts';
import { userResponse, messageResponse } from '../auth/model.ts';
import * as userService from './service.ts';

export const userModule = new Elysia({ prefix: '/users' })
  .use(
    new Elysia({ name: 'users-profile' })
      .use(authGuard)
      .put(
        '/me',
        async ({ userId, body }) => {
          const user = await userService.updateUser(userId, body);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
          };
        },
        {
          body: updateUserBody,
          response: userResponse,
          detail: {
            tags: ['Users'],
            summary: 'Update current user profile',
          },
        },
      ),
  )
  .use(
    new Elysia({ name: 'users-change-password-limited' })
      .use(authGuard)
      .use(rateLimitChangePassword())
      .post(
        '/me/change-password',
        async ({ userId, body }) => {
          await userService.changePassword(
            userId,
            body.currentPassword,
            body.newPassword,
          );
          return { message: 'Password changed successfully' };
        },
        {
          body: changePasswordBody,
          response: messageResponse,
          detail: {
            tags: ['Users'],
            summary: 'Change password',
          },
        },
      ),
  );
