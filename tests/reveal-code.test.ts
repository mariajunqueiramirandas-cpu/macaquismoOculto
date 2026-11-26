import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeRevealCode } from '../src/lib/reveal-code.ts';

test('aceita códigos de quatro caracteres, inclusive ao colar com espaços', () => {
  assert.equal(normalizeRevealCode(' ab 23 '), 'AB23');
  assert.equal(normalizeRevealCode('AB234'), null);
  assert.equal(normalizeRevealCode('AB01'), null);
});

test('aceita códigos de 12 caracteres já emitidos', () => {
  assert.equal(normalizeRevealCode('a234-dmnp-txyz'), 'A234DMNPTXYZ');
});
