import type Elysia from 'elysia';
import type { Cookie } from 'elysia';
import type { Generator } from 'elysia-rate-limit';
import { rateLimit } from 'elysia-rate-limit';

type ExtendedRequest = Request & { cookie: Record<string, Cookie<string>> };

export function proxiedClientKey(
  req: ExtendedRequest,
  server: Elysia['server'],
) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  const cfConnecting = req.headers.get('cf-connecting-ip');
  if (cfConnecting) {
    return cfConnecting.trim();
  }
  const ip = server?.requestIP(req)?.address;
  return ip?.trim() || 'unknown';
}

const jsonRateLimitedResponse = new Response(
  JSON.stringify({
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
  }),
  {
    status: 429,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  },
);

export function rateLimitAuthRegister() {
  return rateLimit({
    scoping: 'scoped',
    duration: 60 * 60 * 1000,
    max: 10,
    countFailedRequest: true,
    generator: proxiedClientKey as Generator<object>,
    errorResponse: jsonRateLimitedResponse,
    headers: true,
  });
}

export function rateLimitAuthLogin() {
  return rateLimit({
    scoping: 'scoped',
    duration: 15 * 60 * 1000,
    max: 30,
    countFailedRequest: true,
    generator: proxiedClientKey as Generator<object>,
    errorResponse: jsonRateLimitedResponse,
    headers: true,
  });
}

export function rateLimitAuthRefresh() {
  return rateLimit({
    scoping: 'scoped',
    duration: 60 * 1000,
    max: 120,
    countFailedRequest: true,
    generator: proxiedClientKey as Generator<object>,
    errorResponse: jsonRateLimitedResponse,
    headers: true,
  });
}

export function rateLimitAuthLogout() {
  return rateLimit({
    scoping: 'scoped',
    duration: 60 * 1000,
    max: 60,
    countFailedRequest: false,
    generator: proxiedClientKey as Generator<object>,
    errorResponse: jsonRateLimitedResponse,
    headers: true,
  });
}

const changePasswordKey: Generator<{ userId: string }> = (
  _req,
  _srv,
  derived,
) => `changePw:${derived.userId}`;

export function rateLimitChangePassword() {
  return rateLimit({
    scoping: 'scoped',
    duration: 60 * 60 * 1000,
    max: 10,
    countFailedRequest: true,
    generator: changePasswordKey,
    errorResponse: jsonRateLimitedResponse,
    headers: true,
  });
}
