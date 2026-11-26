import type { Handle } from '@sveltejs/kit/hooks';
import { getAdmin } from '#lib/server/auth.ts';

export const handle: Handle = async ({ event, resolve }) => {
  const isAdmin = event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/');
  event.locals.admin = isAdmin ? await getAdmin(event) : null;

  if (isAdmin || event.url.pathname === '/') {
    event.setHeaders({
      'cache-control': 'private, no-store',
      'referrer-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow'
    });
  }
  return resolve(event);
};
