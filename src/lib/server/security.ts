import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from 'node:process';
import type { RequestEvent } from '@sveltejs/kit';
import { revealCodeAlphabet, revealCodeLength } from '#lib/reveal-code.ts';
import { db } from './db';

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;
const scryptOptions = { N: 32_768, r: 8, p: 2, maxmem: 64 * 1024 * 1024 };

export function digest(scope: string, secret: string): string {
  const key = env.APP_SECRET;
  if (!key || key.length < 32) throw new Error('Defina APP_SECRET com pelo menos 32 caracteres.');
  return createHmac('sha256', key).update(scope).update(':').update(secret).digest('hex');
}

export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newRevealCode(): string {
  return Array.from({ length: revealCodeLength }, () => revealCodeAlphabet[randomInt(revealCodeAlphabet.length)]).join('');
}

export function isSetupToken(value: string): boolean {
  const token = env.ADMIN_SETUP_TOKEN ?? '';
  return token.length >= 24 && timingSafeEqual(
    Buffer.from(digest('setup', value)),
    Buffer.from(digest('setup', token))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64, scryptOptions);
  return `scrypt-v1:${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
  const [algorithm, encodedSalt, encodedHash] = stored?.split(':') ?? [];
  const salt = encodedSalt ? Buffer.from(encodedSalt, 'base64url') : Buffer.alloc(16);
  const candidate = await derive(password, salt, 64, scryptOptions);
  const expected = encodedHash ? Buffer.from(encodedHash, 'base64url') : Buffer.alloc(64);
  return algorithm === 'scrypt-v1' && expected.length === candidate.length &&
    timingSafeEqual(candidate, expected);
}

let pruneAfter = 0;

export async function withinRateLimit(
  event: RequestEvent | null,
  scope: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  let address = 'shared';
  if (event) {
    try {
      address = event.getClientAddress();
    } catch {
      address = 'proxy';
    }
  }

  if (Date.now() >= pruneAfter) {
    pruneAfter = Date.now() + 60 * 60 * 1_000;
    await db.query('DELETE FROM rate_limit WHERE expires_at <= now()');
  }

  const { rows } = await db.query<{ attempts: number }>(`
    INSERT INTO rate_limit (scope_digest, attempts, expires_at)
    VALUES ($1, 1, now() + $2::integer * interval '1 second')
    ON CONFLICT (scope_digest) DO UPDATE SET
      attempts = CASE WHEN rate_limit.expires_at <= now() THEN 1
                      ELSE least(rate_limit.attempts + 1, $3::integer + 1) END,
      expires_at = CASE WHEN rate_limit.expires_at <= now() THEN EXCLUDED.expires_at
                        ELSE rate_limit.expires_at END
    RETURNING attempts
  `, [digest('rate', `${scope}:${address}`), windowSeconds, limit]);

  return rows[0].attempts <= limit;
}
