import type { RequestEvent } from '@sveltejs/kit';
import { db, transaction } from './db';
import { digest, generateToken, hashPassword, isSetupToken, verifyPassword } from './security';

const sessionCookie = 'mo_admin';
const sessionSeconds = 7 * 24 * 60 * 60;
type Admin = NonNullable<App.Locals['admin']>;

export function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(email);
}

export async function hasOwner(): Promise<boolean> {
  const { rowCount } = await db.query("SELECT 1 FROM admin_account WHERE role = 'owner'");
  return rowCount === 1;
}

export async function getAdmin(event: RequestEvent): Promise<Admin | null> {
  const token = event.cookies.get(sessionCookie);
  if (!token || token.length !== 32) return null;

  const { rows } = await db.query<Admin>(`
    SELECT a.id, a.email, a.role
    FROM admin_session s JOIN admin_account a ON a.id = s.admin_id
    WHERE s.token_digest = $1 AND s.expires_at > now()
  `, [digest('session', token)]);
  return rows[0] ?? null;
}

export async function authenticate(email: string, password: string): Promise<string | null> {
  const { rows } = await db.query<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM admin_account WHERE email = $1', [email]
  );
  const admin = rows[0];
  const valid = await verifyPassword(password, admin?.password_hash);
  return valid ? admin.id : null;
}

export async function startSession(event: RequestEvent, adminId: string) {
  const token = generateToken();
  await db.query('DELETE FROM admin_session WHERE expires_at <= now()');
  await db.query(`
    INSERT INTO admin_session (token_digest, admin_id, expires_at)
    VALUES ($1, $2, now() + $3::integer * interval '1 second')
  `, [digest('session', token), adminId, sessionSeconds]);
  event.cookies.set(sessionCookie, token, {
    path: '/admin',
    httpOnly: true,
    sameSite: 'lax',
    secure: event.url.protocol === 'https:',
    maxAge: sessionSeconds
  });
}

export async function endSession(event: RequestEvent) {
  const token = event.cookies.get(sessionCookie);
  if (token) await db.query('DELETE FROM admin_session WHERE token_digest = $1', [
    digest('session', token)
  ]);
  event.cookies.delete(sessionCookie, { path: '/admin' });
}

export async function activateAdmin(email: string, password: string, token: string): Promise<string | null> {
  const tokenDigest = digest('invitation', token);
  const isBootstrap = isSetupToken(token);

  return transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(71920382)');
    const owner = await client.query("SELECT 1 FROM admin_account WHERE role = 'owner'");
    const bootstrap = owner.rowCount === 0 && isBootstrap;
    if (!bootstrap) {
      const invite = await client.query(`
        DELETE FROM admin_invitation
        WHERE email = $1 AND token_digest = $2 AND expires_at > now()
        RETURNING id
      `, [email, tokenDigest]);
      if (invite.rowCount !== 1) return null;
    }

    const { rows } = await client.query<{ id: string }>(`
      INSERT INTO admin_account (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id
    `, [email, await hashPassword(password), bootstrap ? 'owner' : 'admin']);
    return rows[0].id;
  });
}

export async function inviteAdmin(email: string): Promise<string | null> {
  return transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(71920382)');
    const existing = await client.query('SELECT 1 FROM admin_account WHERE email = $1', [email]);
    if (existing.rowCount) return null;

    const token = generateToken();
    await client.query(`
      INSERT INTO admin_invitation (email, token_digest, expires_at)
      VALUES ($1, $2, now() + interval '48 hours')
      ON CONFLICT (email) DO UPDATE
      SET token_digest = EXCLUDED.token_digest, expires_at = EXCLUDED.expires_at
    `, [email, digest('invitation', token)]);
    return token;
  });
}
