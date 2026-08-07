/**
 * Helpers de recorrência para Contas (Controle de Contas).
 *
 * Espelha o mesmo padrão já usado para Despesas/Rendas recorrentes
 * (`expandRecurringAllOccurrencesForMonth` em `transaction-filters.ts`):
 * um registro RECURRING define um "template" (valor + dia de vencimento,
 * com `endDate`/`excludedDates` opcionais) e cada ciclo mensal é uma
 * ocorrência derivada, não uma linha própria no banco.
 *
 * Diferença importante em relação a Despesas/Rendas: uma conta recorrente
 * precisa de status "pago" independente por ciclo (ex: aluguel de agosto
 * pago não implica aluguel de setembro pago) — por isso `paidMonths`
 * guarda a lista de competências (YYYY-MM) já quitadas, no mesmo espírito
 * leve de `excludedDates`, em vez de criar uma tabela de ocorrências.
 */

export type BillRecurrenceType = 'PUNCTUAL' | 'RECURRING';

export interface RecurringBillLike {
  recurrence: BillRecurrenceType | string;
  dueDate: Date | string;
  endDate?: Date | string | null;
  excludedDates?: string[] | null;
  paid?: boolean;
  paidMonths?: string[] | null;
}

/** Formata uma data como competência "YYYY-MM". */
export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Indica se uma conta (pontual ou recorrente) tem ocorrência na competência
 * informada. Pontuais só "existem" no mês do seu dueDate original.
 */
export function isBillActiveInMonth(bill: RecurringBillLike, year: number, month: number): boolean {
  const due = new Date(bill.dueDate);

  if (bill.recurrence !== 'RECURRING') {
    return due.getFullYear() === year && due.getMonth() + 1 === month;
  }

  const startKey = due.getFullYear() * 12 + due.getMonth();
  const refKey = year * 12 + (month - 1);
  if (refKey < startKey) return false;

  if (bill.endDate) {
    const end = new Date(bill.endDate);
    const endKey = end.getFullYear() * 12 + end.getMonth();
    if (refKey > endKey) return false;
  }

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  if (bill.excludedDates?.includes(monthKey)) return false;

  return true;
}

/**
 * Data de vencimento da ocorrência de uma conta recorrente na competência
 * informada — mantém o dia original do template, ajustando para meses
 * mais curtos (ex: vencimento dia 31 cai no dia 30 em abril).
 */
export function getOccurrenceDueDate(bill: { dueDate: Date | string }, year: number, month: number): Date {
  const original = new Date(bill.dueDate);
  const day = original.getDate();
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const validDay = Math.min(day, lastDayOfMonth);
  return new Date(year, month - 1, validDay, 12, 0, 0, 0);
}

/** Status pago/pendente de uma conta numa competência específica. */
export function isBillPaidForMonth(bill: RecurringBillLike, year: number, month: number): boolean {
  if (bill.recurrence !== 'RECURRING') return !!bill.paid;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return (bill.paidMonths || []).includes(monthKey);
}

/**
 * Resumo do ciclo atual (ou de uma data de referência) de uma conta:
 * se está ativa nesta competência, qual a data de vencimento efetiva
 * e se já foi paga.
 */
export function getCurrentBillCycle(bill: RecurringBillLike, referenceDate: Date = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const active = isBillActiveInMonth(bill, year, month);
  const dueDate = bill.recurrence === 'RECURRING'
    ? getOccurrenceDueDate(bill, year, month)
    : new Date(bill.dueDate);
  const paid = isBillPaidForMonth(bill, year, month);
  return { active, dueDate, paid, monthKey };
}

/** Retorna uma nova lista de paidMonths com a competência marcada/desmarcada. */
export function toggleBillPaidMonth(paidMonths: string[] | null | undefined, monthKey: string, paid: boolean): string[] {
  const set = new Set(paidMonths || []);
  if (paid) set.add(monthKey);
  else set.delete(monthKey);
  return Array.from(set).sort();
}

/**
 * Datas de vencimento de uma série de parcelas fixas (ex: 10x de R$500),
 * uma por mês a partir de `firstDueDate`, mantendo o dia do vencimento
 * original (ajustado para meses mais curtos, igual `getOccurrenceDueDate`).
 * Usado para materializar as N linhas de Bill de uma conta parcelada —
 * diferente de RECURRING, aqui a contagem é fixa e cada parcela é uma
 * linha real e independente (paga individualmente), não uma ocorrência
 * calculada sob demanda.
 */
export function getInstallmentDueDates(firstDueDate: Date | string, count: number): Date[] {
  const first = new Date(firstDueDate);
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const targetMonthDate = new Date(first.getFullYear(), first.getMonth() + i, 1);
    dates.push(getOccurrenceDueDate({ dueDate: first }, targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1));
  }
  return dates;
}
