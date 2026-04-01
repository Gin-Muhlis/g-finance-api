export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',

  databaseUrl: process.env.DATABASE_URL!,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshRememberExpiresIn:
      process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN || '30d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
} as const;
