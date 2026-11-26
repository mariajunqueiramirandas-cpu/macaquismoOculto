export const revealCodeLength = 4;
export const legacyRevealCodeLength = 12;
export const revealCodeAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const revealCodeFragmentKey = 'codigo';

export function normalizeRevealCode(value: string): string | null {
  const code = value.toUpperCase().replace(/[\s-]/g, '');
  const validLength = code.length === revealCodeLength || code.length === legacyRevealCodeLength;
  return validLength && [...code].every((character) => revealCodeAlphabet.includes(character))
    ? code
    : null;
}
