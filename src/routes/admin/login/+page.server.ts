import { fail, redirect } from '@sveltejs/kit';
import { authenticate, hasOwner, startSession, validEmail } from '#lib/server/auth.ts';
import { field } from '#lib/server/forms.ts';
import { withinRateLimit } from '#lib/server/security.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.admin) redirect(303, '/admin');
  return { firstAccess: !(await hasOwner()) };
};

export const actions: Actions = {
  default: async (event) => {
    if (event.locals.admin) redirect(303, '/admin');
    if (!(await withinRateLimit(event, 'login', 12, 600))) {
      return fail(429, { message: 'Muitas tentativas. Tente novamente em alguns minutos.', email: '' });
    }

    const data = await event.request.formData();
    const email = field(data, 'email').trim().toLowerCase();
    const password = field(data, 'password');
    if (!validEmail(email) || !password || password.length > 128) {
      return fail(400, { message: 'Confira seu e-mail e sua senha.', email });
    }

    const admin = await authenticate(email, password);
    if (!admin) return fail(400, { message: 'E-mail ou senha inválidos.', email });
    await startSession(event, admin);
    redirect(303, '/admin');
  }
};
