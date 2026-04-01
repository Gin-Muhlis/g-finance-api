import Elysia from 'elysia';
import { authGuard } from '../../common/middleware/auth.ts';
import {
  registerBody,
  loginBody,
  refreshBody,
  logoutBody,
  authResponse,
  userResponse,
  messageResponse,
} from './model.ts';
import * as authService from './service.ts';

export const authModule = new Elysia({ prefix: '/auth' })
  .post(
    '/register',
    async ({ body }) => {
      const user = await authService.register(body);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      };
    },
    {
      body: registerBody,
      response: userResponse,
      detail: { tags: ['Auth'], summary: 'Register a new account' },
    },
  )
  .post(
    '/login',
    async ({ body }) => {
      return authService.login(body);
    },
    {
      body: loginBody,
      response: authResponse,
      detail: { tags: ['Auth'], summary: 'Login with email and password' },
    },
  )
  .post(
    '/refresh',
    async ({ body }) => {
      return authService.refresh(body.refreshToken);
    },
    {
      body: refreshBody,
      response: authResponse,
      detail: { tags: ['Auth'], summary: 'Refresh access token' },
    },
  )
  .post(
    '/logout',
    async ({ body }) => {
      await authService.logout(body.refreshToken);
      return { message: 'Logged out successfully' };
    },
    {
      body: logoutBody,
      response: messageResponse,
      detail: { tags: ['Auth'], summary: 'Logout and revoke refresh token' },
    },
  )
  .use(authGuard)
  .get(
    '/me',
    async ({ userId }) => {
      const user = await authService.getMe(userId);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      };
    },
    {
      response: userResponse,
      detail: { tags: ['Auth'], summary: 'Get current user profile' },
    },
  );
