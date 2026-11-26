import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { portraitCount } from '#lib/portraits.ts';
import type { EventState, Exchange } from '#lib/event.ts';
import { db, transaction } from './db';
import { drawPairs, type Exclusion } from './draw';
import { digest, newRevealCode } from './security';

type Event = Exchange & { state: EventState };
type Participant = { id: string; name: string; avatar: number };
type ParticipantStatus = Participant & { code_version: number; revealed: boolean };

export class EventError extends Error {}

async function getEvent(client: PoolClient) {
  const { rows } = await client.query<Event>(`
    SELECT state, exchange_date::text, location, budget_cents FROM event WHERE id = 1 FOR UPDATE
  `);
  return rows[0];
}

function requireState(event: Event, allowed: EventState[]) {
  if (!allowed.includes(event.state)) {
    throw new EventError('Esta ação não está disponível na etapa atual da rodada.');
  }
}

export async function eventState(): Promise<EventState> {
  const { rows } = await db.query<{ state: EventState }>('SELECT state FROM event WHERE id = 1');
  return rows[0].state;
}

export async function dashboard() {
  return transaction(async (client) => {
    const event = await getEvent(client);
    const { rows: participants } = await client.query<ParticipantStatus>(`
      SELECT p.id, p.name, p.avatar,
             coalesce(a.code_version, 0) AS code_version, a.revealed_at IS NOT NULL AS revealed
      FROM participant p LEFT JOIN assignment a ON a.giver_id = p.id
      ORDER BY lower(p.name), p.id
    `);
    const { rows: exclusions } = await client.query<Exclusion>(
      'SELECT giver_id, recipient_id FROM exclusion ORDER BY giver_id, recipient_id'
    );
    return { event, participants, exclusions };
  });
}

export async function saveExchange(exchange: Exchange) {
  await db.query(`
    UPDATE event SET exchange_date = $1, location = $2, budget_cents = $3 WHERE id = 1
  `, [exchange.exchange_date, exchange.location, exchange.budget_cents]);
}

export async function addParticipants(names: string[]) {
  return transaction(async (client) => {
    requireState(await getEvent(client), ['draft']);
    const { rows } = await client.query<{ avatar: number }>('SELECT avatar FROM participant');
    const counts = Array<number>(portraitCount).fill(0);
    for (const { avatar } of rows) counts[avatar]++;

    for (const name of names) {
      const min = Math.min(...counts);
      const available = counts.flatMap((uses, index) => uses === min ? [index] : []);
      const avatar = available[randomInt(available.length)];
      counts[avatar]++;
      const inserted = await client.query(
        'INSERT INTO participant (name, avatar) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [name, avatar]
      );
      if (!inserted.rowCount) throw new EventError(`Já existe um participante chamado ${name}.`);
    }
  });
}

export async function removeParticipant(id: string) {
  return transaction(async (client) => {
    requireState(await getEvent(client), ['draft']);
    const result = await client.query('DELETE FROM participant WHERE id = $1', [id]);
    if (!result.rowCount) throw new EventError('Participante não encontrado.');
  });
}

export async function setExclusion(giver: string, recipient: string, both: boolean, remove = false) {
  return transaction(async (client) => {
    requireState(await getEvent(client), ['draft']);
    if (remove) {
      await client.query(
        'DELETE FROM exclusion WHERE giver_id = $1 AND recipient_id = $2', [giver, recipient]
      );
      return;
    }
    const participants = await client.query(
      'SELECT 1 FROM participant WHERE id IN ($1, $2)', [giver, recipient]
    );
    if (participants.rowCount !== 2) throw new EventError('Selecione duas pessoas diferentes.');
    await client.query(
      'INSERT INTO exclusion VALUES ($1, $2) ON CONFLICT DO NOTHING', [giver, recipient]
    );
    if (both) await client.query(
      'INSERT INTO exclusion VALUES ($2, $1) ON CONFLICT DO NOTHING', [giver, recipient]
    );
  });
}

export async function runDraw() {
  return transaction(async (client) => {
    requireState(await getEvent(client), ['draft']);
    const { rows: participants } = await client.query<Participant>(
      'SELECT id, name, avatar FROM participant'
    );
    if (participants.length < 2) throw new EventError('Adicione pelo menos duas pessoas para sortear.');

    const { rows: exclusions } = await client.query<Exclusion>('SELECT * FROM exclusion');
    const result = drawPairs(participants.map(({ id }) => id), exclusions);
    if ('conflicts' in result) {
      const names = participants.filter(({ id }) => result.conflicts.includes(id)).map(({ name }) => name);
      throw new EventError(`Não há combinação válida. Revise os bloqueios de ${names.join(', ')}.`);
    }

    await client.query(`
      INSERT INTO assignment (giver_id, recipient_id)
      SELECT * FROM unnest($1::uuid[], $2::uuid[])
    `, [result.pairs.map((pair) => pair.giver_id), result.pairs.map((pair) => pair.recipient_id)]);
    await client.query("UPDATE event SET state = 'drawn' WHERE id = 1");
  });
}

export async function setStage(stage: 'published' | 'closed' | 'draft', owner: boolean) {
  return transaction(async (client) => {
    const event = await getEvent(client);
    if (stage === 'published') requireState(event, ['drawn']);
    if (stage === 'closed') requireState(event, ['published']);
    if (stage === 'draft') {
      requireState(event, owner ? ['drawn', 'published', 'closed'] : ['drawn']);
      await client.query('DELETE FROM assignment');
    }
    await client.query('UPDATE event SET state = $1 WHERE id = 1', [stage]);
  });
}

export async function issueCode(id: string, version: number) {
  return transaction(async (client) => {
    requireState(await getEvent(client), ['drawn', 'published']);
    const { rows } = await client.query<{ name: string; code_version: number }>(`
      SELECT p.name, a.code_version
      FROM assignment a JOIN participant p ON p.id = a.giver_id WHERE a.giver_id = $1
    `, [id]);
    if (!rows[0]) throw new EventError('Participante não encontrado no sorteio.');

    if (rows[0].code_version !== version) {
      throw new EventError('O código já mudou. Atualize o painel antes de emitir outro.');
    }

    for (let attempt = 0; attempt < 32; attempt++) {
      const code = newRevealCode();
      const codeDigest = digest('reveal', code);
      const claimed = await client.query(`
        INSERT INTO issued_reveal_code (digest) VALUES ($1) ON CONFLICT DO NOTHING
      `, [codeDigest]);
      if (!claimed.rowCount) continue;

      await client.query(`
        UPDATE assignment SET code_digest = $2, code_version = code_version + 1 WHERE giver_id = $1
      `, [id, codeDigest]);
      return { name: rows[0].name, code };
    }

    throw new EventError('Não foi possível emitir um código agora. Tente novamente.');
  });
}

export async function reveal(code: string) {
  return transaction(async (client) => {
    const event = await getEvent(client);
    requireState(event, ['published']);

    const { rows } = await client.query<{ name: string; avatar: number }>(`
      UPDATE assignment a SET revealed_at = coalesce(revealed_at, now())
      FROM participant p
      WHERE a.recipient_id = p.id AND a.code_digest = $1
      RETURNING p.name, p.avatar
    `, [digest('reveal', code)]);
    if (!rows[0]) return null;
    const { exchange_date, location, budget_cents } = event;
    return { ...rows[0], exchange_date, location, budget_cents };
  });
}
