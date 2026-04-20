import Elysia from 'elysia';
import { verifyAccessToken } from '../../utils/jwt.ts';
import { UnauthorizedError } from '../errors.ts';

export const authGuard = new Elysia({ name: 'auth-guard' }).derive(
  { as: 'scoped' },
  async ({ headers }) => {
    const authorization = headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authorization.slice(7);
    const payload = await verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    return {
      userId: payload.sub,
      userName: payload.name,
      userEmail: payload.email,
    };
  },
);
