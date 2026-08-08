/**
 * billing-cycle.ts — Motor ÚNICO de ciclo de fatura de cartão de crédito.
 *
 * Substitui `calculateInstallmentDates` / `calculateClosingDate` / `calculateDueDate`
 * de `credit-utils.ts`, que tinham três defeitos confirmados:
 *
 *  1. `calculateInstallmentDates` assumia implicitamente que `dueDay < closingDay`
 *     (vencimento sempre no mês seguinte ao fechamento) e somava um deslocamento fixo
 *     de +1/+2 meses. Num cartão que fecha dia 05 e vence dia 15 — configuração comum —
 *     toda compra caía uma fatura atrasada.
 *
 *  2. O clamp de dia inválido estava invertido: `new Date(2026, 1, 31)` já transborda
 *     para 03/mar, e o `setDate(lastDayOfMonth)` seguinte gravava 28/MAR em vez de
 *     28/FEV. Cartões que fecham dia 29/30/31 geravam faturas no mês errado — e
 *     duplicadas, já que `closingDate` faz parte da chave única de `CreditBill`.
 *
 *  3. `purchaseDay > closingDay` nunca era verdade para `closingDay = 31`, então esses
 *     cartões "nunca fechavam" em fevereiro/abril/junho/setembro/novembro.
 *
 * MODELO
 * ------
 * Um ciclo é identificado pelo mês em que a fatura FECHA (`cycleYear`/`cycleMonth`).
 * Isso é deliberado: o fechamento é o evento que define a qual fatura uma compra
 * pertence, e é o que compõe a chave única `@@unique([creditCardId, closingDate])`.
 * O vencimento é derivado:
 *
 *   - `dueDay > closingDay`  → vence no MESMO mês do fechamento (ex.: fecha 05, vence 15)
 *   - `dueDay <= closingDay` → vence no mês SEGUINTE ao fechamento (ex.: fecha 30, vence 07)
 *
 * Uma compra pertence ao ciclo que fecha no mês da compra, se ela ocorreu ATÉ o dia de
 * fechamento (inclusive); caso contrário, ao ciclo do mês seguinte.
 *
 * TIMEZONE
 * --------
 * Todas as datas são construídas e lidas em **UTC ao meio-dia** (`Date.UTC(y, m, d, 12)`).
 * Isso não é detalhe de estilo — é requisito de correção, por dois motivos:
 *
 *  a) O resultado precisa ser idêntico rode onde rodar. O servidor de produção roda em
 *     UTC e a máquina de desenvolvimento em America/Sao_Paulo (UTC-3). Com
 *     `new Date(y, m, d)` (meia-noite LOCAL), os dois ambientes produziriam instantes
 *     diferentes para o mesmo dia — e como `CreditBill` é buscada por igualdade exata em
 *     `closingDate`, a fatura simplesmente não seria encontrada, gerando duplicata.
 *
 *  b) Meio-dia, e não meia-noite, dá 12h de folga em cada direção. Um valor gravado como
 *     meia-noite UTC aparece como o DIA ANTERIOR para qualquer código de exibição que use
 *     getters locais em UTC-3 — foi exatamente o que aconteceu com os dados legados.
 *
 * Consequência prática: dentro deste módulo usa-se sempre `getUTC*` / `Date.UTC`, nunca
 * os getters locais. Quem consome estas datas para exibir deve formatar com
 * `timeZone: 'UTC'` (ou usar os getters UTC).
 */

export interface BillingCard {
  closingDay: number;
  dueDay: number;
}

export interface BillingCycle {
  /** Ano do fechamento da fatura. */
  cycleYear: number;
  /** Mês do fechamento da fatura, 0-based (janeiro = 0). */
  cycleMonth: number;
  /** Data de fechamento, com o dia já ajustado ao tamanho do mês. */
  closingDate: Date;
  /** Data de vencimento, com o dia já ajustado ao tamanho do mês. */
  dueDate: Date;
  /** Identificador estável do ciclo, no formato `YYYY-MM` do fechamento. */
  billKey: string;
}

/** Hora UTC fixa das datas de ciclo — dá 12h de folga em cada direção na exibição. */
const CYCLE_HOUR_UTC = 12;

function assertValidDay(day: number, label: string): void {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`${label} deve ser um inteiro entre 1 e 31 (recebido: ${day})`);
  }
}

export function assertValidCard(card: BillingCard): void {
  assertValidDay(card.closingDay, 'closingDay');
  assertValidDay(card.dueDay, 'dueDay');
}

/** Último dia do mês (`month` 0-based, aceita valores fora de 0-11 para overflow). */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Constrói a data `day` de `month`/`year` em UTC ao meio-dia, truncando o dia ao último
 * do mês quando ele não existe (31 de fevereiro → 28 ou 29). Diferente do código antigo,
 * o clamp é aplicado ANTES de construir a data, então nunca há transbordo para o mês
 * seguinte. Aceita `month` fora de 0-11 (normaliza o ano).
 */
export function clampDayToMonth(year: number, month: number, day: number): Date {
  const normalizedYear = year + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(normalizedYear, normalizedMonth);
  return new Date(
    Date.UTC(normalizedYear, normalizedMonth, Math.min(day, maxDay), CYCLE_HOUR_UTC, 0, 0, 0),
  );
}

/** `true` quando o vencimento cai no mesmo mês do fechamento. */
export function dueFallsInClosingMonth(card: BillingCard): boolean {
  return card.dueDay > card.closingDay;
}

/**
 * Monta o ciclo cujo FECHAMENTO ocorre em `cycleMonth`/`cycleYear` (mês 0-based).
 * É a forma canônica de obter um ciclo; as demais funções derivam desta.
 */
export function getCycleByClosingMonth(
  card: BillingCard,
  cycleYear: number,
  cycleMonth: number,
): BillingCycle {
  assertValidCard(card);

  const closingDate = clampDayToMonth(cycleYear, cycleMonth, card.closingDay);
  const normalizedYear = closingDate.getUTCFullYear();
  const normalizedMonth = closingDate.getUTCMonth();

  const dueMonthOffset = dueFallsInClosingMonth(card) ? 0 : 1;
  const dueDate = clampDayToMonth(normalizedYear, normalizedMonth + dueMonthOffset, card.dueDay);

  return {
    cycleYear: normalizedYear,
    cycleMonth: normalizedMonth,
    closingDate,
    dueDate,
    billKey: `${normalizedYear}-${String(normalizedMonth + 1).padStart(2, '0')}`,
  };
}

/**
 * Monta o ciclo cuja fatura VENCE em `dueMonth`/`dueYear` (mês 0-based).
 *
 * Necessário para compatibilidade: várias telas e rotas identificam a fatura pelo mês
 * de vencimento ("fatura de março"), não pelo de fechamento.
 */
export function getCycleByDueMonth(
  card: BillingCard,
  dueYear: number,
  dueMonth: number,
): BillingCycle {
  assertValidCard(card);
  const closingMonthOffset = dueFallsInClosingMonth(card) ? 0 : -1;
  return getCycleByClosingMonth(card, dueYear, dueMonth + closingMonthOffset);
}

/**
 * Ciclo ao qual uma compra pertence.
 *
 * Regra: compra ATÉ o dia de fechamento (inclusive) entra na fatura que fecha naquele
 * mês; depois disso, na do mês seguinte. Comparação feita por dia do mês já truncado,
 * então um cartão que fecha dia 31 fecha corretamente no dia 28/29 em fevereiro.
 *
 * `purchaseDate` é lida em UTC. Datas vindas de `<input type="date">` chegam como
 * `2026-08-05T00:00:00Z` — lê-las com getters locais em UTC-3 daria 04/08, jogando a
 * compra para a fatura errada quando o dia da compra é o próprio dia de fechamento.
 */
export function resolveBillingCycle(card: BillingCard, purchaseDate: Date): BillingCycle {
  assertValidCard(card);
  if (!(purchaseDate instanceof Date) || Number.isNaN(purchaseDate.getTime())) {
    throw new TypeError('purchaseDate deve ser uma Date válida');
  }

  const year = purchaseDate.getUTCFullYear();
  const month = purchaseDate.getUTCMonth();
  const day = purchaseDate.getUTCDate();

  const effectiveClosingDay = Math.min(card.closingDay, lastDayOfMonth(year, month));
  const monthOffset = day > effectiveClosingDay ? 1 : 0;

  return getCycleByClosingMonth(card, year, month + monthOffset);
}

export interface InstallmentCycle extends BillingCycle {
  /** Número da parcela, 1-based. */
  installmentNumber: number;
  /** Total de parcelas da compra. */
  installmentCount: number;
  /** Valor desta parcela, em reais. */
  amount: number;
}

/**
 * Distribui uma compra parcelada pelos ciclos consecutivos, a partir do ciclo da compra.
 *
 * O valor é dividido com arredondamento para 2 casas e a diferença residual é aplicada
 * na ÚLTIMA parcela, de modo que a soma das parcelas seja exatamente `totalAmount`.
 */
export function getInstallmentCycles(
  card: BillingCard,
  purchaseDate: Date,
  installmentCount: number,
  totalAmount: number,
): InstallmentCycle[] {
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new RangeError(`installmentCount deve ser um inteiro >= 1 (recebido: ${installmentCount})`);
  }

  const firstCycle = resolveBillingCycle(card, purchaseDate);
  const baseAmount = Math.round((totalAmount / installmentCount) * 100) / 100;

  const cycles: InstallmentCycle[] = [];
  for (let i = 0; i < installmentCount; i++) {
    const cycle = getCycleByClosingMonth(card, firstCycle.cycleYear, firstCycle.cycleMonth + i);
    const isLast = i === installmentCount - 1;
    const amount = isLast
      ? Math.round((totalAmount - baseAmount * (installmentCount - 1)) * 100) / 100
      : baseAmount;

    cycles.push({
      ...cycle,
      installmentNumber: i + 1,
      installmentCount,
      amount,
    });
  }

  return cycles;
}
