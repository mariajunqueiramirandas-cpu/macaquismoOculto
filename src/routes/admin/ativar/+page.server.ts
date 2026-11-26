import { fail, redirect } from '@sveltejs/kit';
import { activateAdmin, hasOwner, startSession, validEmail } from '#lib/server/auth.ts';
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
    if (!(await withinRateLimit(event, 'activation', 12, 600))) {
      return fail(429, { message: 'Muitas tentativas. Tente novamente em alguns minutos.', email: '' });
    }

    const data = await event.request.formData();
    const email = field(data, 'email').trim().toLowerCase();
    const password = field(data, 'password');
    const token = field(data, 'token').trim();
    if (!validEmail(email) || password.length < 12 || password.length > 128) {
      return fail(400, { message: 'Informe um e-mail válido e crie uma senha de 12 a 128 caracteres.', email });
    }
    if (!token || token.length > 256) {
      return fail(400, { message: 'Confira o código de ativação.', email });
    }

    const admin = await activateAdmin(email, password, token);
    if (!admin) return fail(400, { message: 'Código inválido ou expirado para este e-mail.', email });
    await startSession(event, admin);
    redirect(303, '/admin');
  }
};
