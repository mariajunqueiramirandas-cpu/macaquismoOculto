import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawPairs } from '../src/lib/server/draw.ts';

test('um bloqueio vale somente para quem entrega o presente', () => {
  const result = drawPairs(['Bia', 'Léo', 'Caio'], [{ giver_id: 'Bia', recipient_id: 'Léo' }]);
  assert.ok('pairs' in result);
  const recipients = new Map(result.pairs.map(({ giver_id, recipient_id }) => [giver_id, recipient_id]));
  assert.equal(recipients.get('Bia'), 'Caio');
  assert.equal(recipients.get('Léo'), 'Bia');
  assert.equal(recipients.get('Caio'), 'Léo');
});

test('detecta competição por um destinatário mesmo com opções individuais', () => {
  const result = drawPairs(['A', 'B', 'C'], [
    { giver_id: 'A', recipient_id: 'B' }, { giver_id: 'B', recipient_id: 'A' }
  ]);
  assert.ok('conflicts' in result);
  assert.deepEqual(new Set(result.conflicts), new Set(['A', 'B']));
});

test('treze participantes dão e recebem uma vez, sempre de outra pessoa', () => {
  const participants = Array.from({ length: 13 }, (_, index) => String(index));
  const result = drawPairs(participants, []);
  assert.ok('pairs' in result);
  assert.equal(new Set(result.pairs.map(({ giver_id }) => giver_id)).size, 13);
  assert.equal(new Set(result.pairs.map(({ recipient_id }) => recipient_id)).size, 13);
  assert.ok(result.pairs.every(({ giver_id, recipient_id }) => giver_id !== recipient_id));
});
