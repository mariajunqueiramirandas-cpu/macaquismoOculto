import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { endSession, inviteAdmin, validEmail } from '#lib/server/auth.ts';
import { field } from '#lib/server/forms.ts';
import {
  EventError, addParticipants, dashboard, issueCode, removeParticipant,
  runDraw, saveExchange, setExclusion, setStage
} from '#lib/server/event.ts';
import type { Actions, PageServerLoad } from './$types';

type Admin = NonNullable<App.Locals['admin']>;
type Section = 'event' | 'draw' | 'participants' | 'exclusions' | 'admins';
type Notice = {
  message: string;
  code?: string;
  target?: string;
  label?: string;
};

function requireAdmin(locals: App.Locals): Admin {
  if (!locals.admin) redirect(303, '/admin/login');
  return locals.admin;
}

function readId(data: FormData, name: string): string {
  const id = field(data, name);
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) {
    throw new EventError('Selecione um registro válido.');
  }
  return id;
}

function panelAction(
  section: Section,
  work: (data: FormData, admin: Admin) => Promise<Notice>
) {
  return async (event: RequestEvent) => {
    const admin = requireAdmin(event.locals);
    try {
      const result = await work(await event.request.formData(), admin);
      return { ok: true, section, ...result };
    } catch (error) {
      if (!(error instanceof EventError)) throw error;
      return fail(400, { ok: false, section, message: error.message } as const);
    }
  };
}

export const load: PageServerLoad = async ({ locals }) => {
  const admin = requireAdmin(locals);
  const data = await dashboard();
  const admins = admin.role === 'owner'
    ? (await db.query<Admin>('SELECT id, email, role FROM admin_account ORDER BY role DESC, email')).rows
    : [];
  const invites = admin.role === 'owner'
    ? (await db.query<{ id: string; email: string }>(
      'SELECT id, email FROM admin_invitation WHERE expires_at > now() ORDER BY email'
    )).rows
    : [];

  return { ...data, admin, admins, invites };
};

export const actions: Actions = {
  details: panelAction('event', async (data) => {
    const date = field(data, 'date');
    const location = field(data, 'location').trim();
    const budget = field(data, 'budget').replace(',', '.').trim();
    const dateValue = new Date(`${date}T12:00:00Z`);
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000') ||
        Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== date)) {
      throw new EventError('Informe uma data válida.');
    }
    if (location.length > 120) throw new EventError('Use até 120 caracteres para o local.');
    const cents = budget ? Math.round(Number(budget) * 100) : null;
    if (budget && (!/^\d+(?:\.\d{1,2})?$/.test(budget) || cents === null || cents > 1_000_000)) {
      throw new EventError('Informe um valor entre R$ 0,00 e R$ 10.000,00.');
    }

    await saveExchange({ exchange_date: date || null, location, budget_cents: cents });
    return { message: 'Detalhes salvos.' };
  }),
  add: panelAction('participants', async (data) => {
    const names = field(data, 'names').split(/\r?\n/).map((name) => name.trim().normalize('NFC')).filter(Boolean);
    if (!names.length || names.some((name) => name.length > 60)) {
      throw new EventError('Informe um nome por linha, com até 60 caracteres cada.');
    }
    await addParticipants(names);
    return { message: names.length === 1 ? 'Participante adicionado.' : 'Participantes adicionados.' };
  }),
  remove: panelAction('participants', async (data) => {
    await removeParticipant(readId(data, 'id'));
    return { message: 'Participante removido.' };
  }),
  block: panelAction('exclusions', async (data) => {
    await setExclusion(readId(data, 'giver'), readId(data, 'recipient'), field(data, 'both') === 'on');
    return { message: 'Bloqueio salvo.' };
  }),
  unblock: panelAction('exclusions', async (data) => {
    await setExclusion(readId(data, 'giver'), readId(data, 'recipient'), false, true);
    return { message: 'Bloqueio removido.' };
  }),
  draw: panelAction('draw', async () => {
    await runDraw();
    return { message: 'Sorteio pronto para liberar.' };
  }),
  publish: panelAction('draw', async () => {
    await setStage('published', false);
    return { message: 'Revelação liberada.' };
  }),
  close: panelAction('draw', async (data) => {
    if (field(data, 'confirm') !== 'on') throw new EventError('Confirme o encerramento da revelação.');
    await setStage('closed', false);
    return { message: 'Revelação encerrada.' };
  }),
  reset: panelAction('draw', async (data, admin) => {
    if (field(data, 'confirm') !== 'on') throw new EventError('Confirme a reabertura da rodada.');
    await setStage('draft', admin.role === 'owner');
    return { message: 'Rodada reaberta. Os códigos anteriores perderam a validade.' };
  }),
  code: panelAction('participants', async (data) => {
    const id = readId(data, 'id');
    const version = field(data, 'version');
    if (!/^\d+$/.test(version)) throw new EventError('Atualize o painel antes de emitir o código.');
    const { code, name } = await issueCode(id, Number(version));
    return { message: 'Envie o código no privado pelo WhatsApp.', code, target: id, label: name };
  }),
  invite: panelAction('admins', async (data, admin) => {
    if (admin.role !== 'owner') throw new EventError('Somente o responsável pode convidar admins.');
    const email = field(data, 'email').trim().toLowerCase();
    if (!validEmail(email)) throw new EventError('Informe um e-mail válido.');
    const code = await inviteAdmin(email);
    if (!code) throw new EventError('Já existe uma conta com este e-mail.');
    return { message: 'Compartilhe o código e a página de ativação no privado. Válido por 48 horas.', code, label: email };
  }),
  cancelInvite: panelAction('admins', async (data, admin) => {
    if (admin.role !== 'owner') throw new EventError('Somente o responsável pode cancelar convites.');
    await db.query('DELETE FROM admin_invitation WHERE id = $1', [readId(data, 'id')]);
    return { message: 'Convite cancelado.' };
  }),
  revoke: panelAction('admins', async (data, admin) => {
    if (admin.role !== 'owner') throw new EventError('Somente o responsável pode revogar acessos.');
    await db.query("DELETE FROM admin_account WHERE id = $1 AND role = 'admin'", [readId(data, 'id')]);
    return { message: 'Acesso revogado.' };
  }),
  logout: async (event) => {
    await endSession(event);
    redirect(303, '/admin/login');
  }
};
