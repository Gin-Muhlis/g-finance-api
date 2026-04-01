import Elysia from 'elysia';
import pino from 'pino';

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

export const loggerMiddleware = new Elysia({ name: 'logger' })
  .onRequest(({ request, store }) => {
    (store as Record<string, unknown>).startTime = Date.now();
  })
  .onAfterResponse(({ request, store, set }) => {
    const duration =
      Date.now() - ((store as Record<string, unknown>).startTime as number);
    const url = new URL(request.url);
    logger.info(
      {
        method: request.method,
        path: url.pathname,
        status: set.status ?? 200,
        duration: `${duration}ms`,
      },
      `${request.method} ${url.pathname}`,
    );
  })
  .onError(({ request, error }) => {
    const url = new URL(request.url);
    logger.error(
      {
        method: request.method,
        path: url.pathname,
        error: error.message,
      },
      `Error: ${request.method} ${url.pathname}`,
    );
  });
