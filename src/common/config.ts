function parseCorsOrigins(raw: string | undefined): string | string[] {
  const fallback = 'https://g-finance-tech.vercel.app';
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (list.length === 0) return fallback;
  if (list.length === 1) return list[0]!;
  return list;
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || '0.0.0.0',

  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN),

  swaggerEnabled:
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true',

  allowRegistration: process.env.ALLOW_REGISTRATION === 'true',

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
