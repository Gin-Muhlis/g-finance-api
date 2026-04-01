export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'argon2id' });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function hashToken(token: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(token);
  return hasher.digest('hex');
}
