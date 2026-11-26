export type EventState = 'draft' | 'drawn' | 'published' | 'closed';

export type Exchange = {
  exchange_date: string | null;
  location: string;
  budget_cents: number | null;
};

export const stateLabels: Record<EventState, string> = {
  draft: 'Rascunho',
  drawn: 'Sorteado',
  published: 'Revelação aberta',
  closed: 'Encerrado'
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});
const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL'
});

export function dateLabel(date: string | null): string {
  return date ? dateFormatter.format(new Date(`${date}T12:00:00Z`)) : 'A combinar';
}

export function budgetLabel(cents: number | null): string {
  return cents === null ? 'A combinar' : moneyFormatter.format(cents / 100);
}
