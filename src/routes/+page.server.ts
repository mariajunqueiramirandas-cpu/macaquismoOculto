import { fail } from '@sveltejs/kit';
import { EventError, eventState, reveal } from '#lib/server/event.ts';
import { field } from '#lib/server/forms.ts';
import { normalizeRevealCode, revealCodeLength } from '#lib/reveal-code.ts';
import { withinRateLimit } from '#lib/server/security.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ state: await eventState() });

export const actions: Actions = {
  default: async (event) => {
    if (!(await withinRateLimit(event, 'reveal', 30, 300))) {
      return fail(429, { message: 'Muitas tentativas. Aguarde alguns minutos para tentar de novo.' });
    }

    const form = await event.request.formData();
    const code = normalizeRevealCode(field(form, 'code'));
    if (!code) return fail(400, { message: 'Confira o código que você recebeu.' });

    if (code.length === revealCodeLength) {
      if (await eventState() !== 'published') {
        return fail(409, { message: 'A revelação está fechada. Fale com um dos admins da rodada.' });
      }
      if (!(await withinRateLimit(null, 'short-reveal', 120, 3600))) {
        return fail(429, { message: 'Muitas tentativas de código. Tente novamente mais tarde.' });
      }
    }

    try {
      const result = await reveal(code);
      return result ? { result } : fail(400, { message: 'Código inválido. Confira a mensagem que você recebeu.' });
    } catch (error) {
      if (error instanceof EventError) {
        return fail(409, { message: 'A revelação está fechada. Fale com um dos admins da rodada.' });
      }
      throw error;
    }
  }
};
