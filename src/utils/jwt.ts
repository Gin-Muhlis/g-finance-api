import { config } from '@/common/config.ts';

const textEncoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = parseInt(match[1]!);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * multipliers[unit]!;
}

export interface AccessTokenPayload {
  sub: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  name?: string;
  email?: string;
  type?: string;
  [key: string]: unknown;
}

async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string,
): Promise<string> {
  const key = await importKey(secret);
  const header = { alg: 'HS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + parseDuration(expiresIn),
  };

  const encodedHeader = base64UrlEncode(
    textEncoder.encode(JSON.stringify(header)),
  );
  const encodedPayload = base64UrlEncode(
    textEncoder.encode(JSON.stringify(fullPayload)),
  );
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(data),
  );

  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyJwtRaw(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const key = await importKey(secret);
    const data = `${parts[0]}.${parts[1]}`;
    const signature = base64UrlDecode(parts[2]!);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(signature),
      textEncoder.encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[1]!)),
    ) as JwtPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function generateAccessToken(user: {
  id: string;
  name: string;
  email: string;
}): Promise<string> {
  return signJwt(
    { sub: user.id, name: user.name, email: user.email },
    config.jwt.accessSecret,
    config.jwt.accessExpiresIn,
  );
}

export async function generateRefreshToken(
  userId: string,
  rememberMe = false,
): Promise<string> {
  const expiresIn = rememberMe
    ? config.jwt.refreshRememberExpiresIn
    : config.jwt.refreshExpiresIn;

  return signJwt(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    expiresIn,
  );
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  const payload = await verifyJwtRaw(token, config.jwt.accessSecret);
  if (!payload) return null;
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    return null;
  }
  return {
    sub: payload.sub,
    name: payload.name,
    email: payload.email,
    iat: payload.iat,
    exp: payload.exp,
  };
}

export async function verifyRefreshToken(
  token: string,
): Promise<JwtPayload | null> {
  return verifyJwtRaw(token, config.jwt.refreshSecret);
}

export function getRefreshTokenExpiresAt(rememberMe = false): Date {
  const duration = rememberMe
    ? config.jwt.refreshRememberExpiresIn
    : config.jwt.refreshExpiresIn;
  const seconds = parseDuration(duration);
  return new Date(Date.now() + seconds * 1000);
}
