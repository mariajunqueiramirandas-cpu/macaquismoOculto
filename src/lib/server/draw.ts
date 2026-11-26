import { randomInt } from 'node:crypto';

export type Exclusion = { giver_id: string; recipient_id: string };
type DrawResult = { pairs: Exclusion[] } | { conflicts: string[] };

function shuffled<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function drawPairs(participants: string[], exclusions: Exclusion[]): DrawResult {
  const forbidden = new Set(exclusions.map(({ giver_id, recipient_id }) => `${giver_id}:${recipient_id}`));
  const options = new Map(participants.map((giver) => [
    giver,
    shuffled(participants.filter((recipient) => recipient !== giver && !forbidden.has(`${giver}:${recipient}`)))
  ]));
  const byRecipient = new Map<string, string>();

  // Ao achar uma opção ocupada, tenta realocar quem a ocupa. Se não há caminho,
  // as pessoas visitadas disputam menos destinatários do que o grupo precisa.
  function assign(giver: string, visited: Set<string>, involved: Set<string>): boolean {
    involved.add(giver);
    for (const recipient of options.get(giver) ?? []) {
      if (visited.has(recipient)) continue;
      visited.add(recipient);
      const current = byRecipient.get(recipient);
      if (!current || assign(current, visited, involved)) {
        byRecipient.set(recipient, giver);
        return true;
      }
    }
    return false;
  }

  const order = shuffled(participants).sort((a, b) => options.get(a)!.length - options.get(b)!.length);
  for (const giver of order) {
    const involved = new Set<string>();
    if (!assign(giver, new Set(), involved)) return { conflicts: [...involved] };
  }

  return {
    pairs: [...byRecipient].map(([recipient_id, giver_id]) => ({ giver_id, recipient_id }))
  };
}
