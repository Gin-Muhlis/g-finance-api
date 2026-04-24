import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { config } from './common/config.ts';
import { AppError } from './common/errors.ts';
import { loggerMiddleware, logger } from './common/middleware/logger.ts';
import { authModule } from './modules/auth/index.ts';
import { userModule } from './modules/user/index.ts';
import { walletModule } from './modules/wallet/index.ts';
import { categoryModule } from './modules/category/index.ts';
import { transactionModule } from './modules/transaction/index.ts';
import { budgetModule } from './modules/budget/index.ts';

/** Elysia `onError` error union includes types without `message` (e.g. custom status). */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '';
}

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: 'G-Finance API',
          version: '1.0.0',
          description: 'Personal finance tracking REST API',
        },
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Users', description: 'User management' },
          { name: 'Wallets', description: 'Wallet/savings management' },
          { name: 'Categories', description: 'Transaction categories' },
          { name: 'Transactions', description: 'Income & expense tracking' },
          { name: 'Budgets', description: 'Monthly expense budgets vs actuals' },
        ],
      },
    }),
  )
  .use(loggerMiddleware)
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.code ?? 'ERROR',
        message: error.message,
      };
    }

    const message = getErrorMessage(error);

    if (message === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: 'NOT_FOUND',
        message: 'Route not found',
      };
    }

    // Elysia validation errors
    if (message.includes('Expected')) {
      set.status = 422;
      return {
        error: 'VALIDATION_ERROR',
        message,
      };
    }

    logger.error(error, 'Unhandled error');
    set.status = 500;
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    };
  })
  .get('/', () => ({
    name: 'G-Finance API',
    version: '1.0.0',
    docs: '/swagger',
  }))
  .group('/api', (app) =>
    app
      .use(authModule)
      .use(userModule)
      .use(walletModule)
      .use(categoryModule)
      .use(transactionModule)
      .use(budgetModule),
  )
  .listen({
    port: config.port,
    hostname: config.host,
  });

logger.info(
  `🚀 G-Finance API running at http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
  `📚 Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`,
);

export type App = typeof app;
