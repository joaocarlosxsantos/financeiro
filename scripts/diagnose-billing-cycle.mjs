/**
 * Diagnóstico e backfill do ciclo de fatura.
 *
 *   node scripts/diagnose-billing-cycle.mjs            # só relatório, não altera nada
 *   node scripts/diagnose-billing-cycle.mjs --apply    # aplica a correção
 *
 * CONTEXTO
 * --------
 * `src/lib/billing-cycle.ts` passou a construir todas as datas de ciclo em **UTC ao
 * meio-dia**, por duas razões:
 *
 *   1. Determinismo. O código antigo usava `new Date(y, m, d)` — meia-noite no fuso de
 *      quem executa. Em produção (UTC) isso gera `T00:00:00Z`; numa máquina em UTC-3,
 *      `T03:00:00Z`. Como `CreditBill` é buscada por igualdade EXATA em `closingDate`,
 *      instantes diferentes para o mesmo dia significam fatura não encontrada e
 *      duplicada.
 *   2. Exibição. Meia-noite UTC aparece como o DIA ANTERIOR em qualquer formatação com
 *      getters locais em UTC-3. Meio-dia dá 12h de folga em cada direção.
 *
 * Portanto as faturas existentes (gravadas a `T00:00:00Z`) precisam ser normalizadas
 * para `T12:00:00Z`, e as que caíram no dia errado por causa do bug de clamp precisam do
 * dia corrigido. É isso que este script faz.
 *
 * A matemática abaixo é uma cópia enxuta de src/lib/billing-cycle.ts, para rodar em Node
 * puro sem ts-node. Se billing-cycle.ts mudar, revisar aqui.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const CYCLE_HOUR_UTC = 12;

const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

function clampDayToMonth(year, month, day) {
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return new Date(Date.UTC(y, m, Math.min(day, lastDayOfMonth(y, m)), CYCLE_HOUR_UTC, 0, 0, 0));
}

function getCycleByDueMonth(card, dueYear, dueMonth) {
  const sameMonth = card.dueDay > card.closingDay;
  const closingDate = clampDayToMonth(dueYear, dueMonth + (sameMonth ? 0 : -1), card.closingDay);
  const dueDate = clampDayToMonth(
    closingDate.getUTCFullYear(),
    closingDate.getUTCMonth() + (sameMonth ? 0 : 1),
    card.dueDay,
  );
  return { closingDate, dueDate };
}

/** Formata lendo em UTC — a convenção do módulo. Ler local foi o que confundiu antes. */
const fmt = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

const sameInstant = (a, b) => a.getTime() === b.getTime();
/** Mesmo dia do calendário em UTC, ignorando a hora. */
const sameUtcDay = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

async function main() {
  console.log(APPLY ? '\n*** MODO --apply: o banco SERÁ alterado ***\n' : '\n(modo relatório — nada será alterado)\n');

  const cards = await prisma.creditCard.findMany({
    select: { id: true, name: true, closingDay: true, dueDay: true },
    orderBy: { name: 'asc' },
  });

  let needFix = 0;
  let dayChanges = 0;
  let collisions = 0;
  let applied = 0;

  for (const card of cards) {
    const bills = await prisma.creditBill.findMany({
      where: { creditCardId: card.id },
      select: { id: true, closingDate: true, dueDate: true, totalAmount: true, status: true },
      orderBy: { dueDate: 'asc' },
    });

    console.log(`\n${card.name}  (fecha ${card.closingDay}, vence ${card.dueDay}) — ${bills.length} fatura(s)`);

    // Índice por instante para detectar colisão com @@unique([creditCardId, closingDate])
    const byClosingInstant = new Map(bills.map((b) => [b.closingDate.getTime(), b]));

    for (const bill of bills) {
      // Âncora: o mês de VENCIMENTO gravado, lido em UTC.
      const expected = getCycleByDueMonth(card, bill.dueDate.getUTCFullYear(), bill.dueDate.getUTCMonth());

      const closingOk = sameInstant(bill.closingDate, expected.closingDate);
      const dueOk = sameInstant(bill.dueDate, expected.dueDate);
      if (closingOk && dueOk) continue;

      needFix++;
      const dayMoved = !sameUtcDay(bill.closingDate, expected.closingDate);
      if (dayMoved) dayChanges++;

      const kind = dayMoved ? 'DIA ERRADO ' : 'só horário ';
      console.log(
        `  ${kind} vence ${fmt(bill.dueDate)} | R$ ${Number(bill.totalAmount).toFixed(2)} ${bill.status}`,
      );
      console.log(`      closingDate  ${bill.closingDate.toISOString()} → ${expected.closingDate.toISOString()}`);
      if (!dueOk) {
        console.log(`      dueDate      ${bill.dueDate.toISOString()} → ${expected.dueDate.toISOString()}`);
      }

      // Colisão: já existe OUTRA fatura ocupando o closingDate de destino?
      const occupant = byClosingInstant.get(expected.closingDate.getTime());
      if (occupant && occupant.id !== bill.id) {
        collisions++;
        console.log(`      ⚠️  COLISÃO: a fatura ${occupant.id} já ocupa esse closingDate. Pulando — resolver à mão.`);
        continue;
      }

      if (APPLY) {
        await prisma.creditBill.update({
          where: { id: bill.id },
          data: { closingDate: expected.closingDate, dueDate: expected.dueDate },
        });
        byClosingInstant.delete(bill.closingDate.getTime());
        byClosingInstant.set(expected.closingDate.getTime(), bill);
        applied++;
        console.log('      ✔ atualizada');
      }
    }
  }

  console.log('\n=== RESUMO ===');
  console.log(`Faturas fora da convenção nova : ${needFix}`);
  console.log(`  · das quais mudam de DIA     : ${dayChanges}  (bug de clamp — impacto real de negócio)`);
  console.log(`  · só normalização de horário : ${needFix - dayChanges}  (00:00Z → 12:00Z)`);
  if (collisions) console.log(`Colisões não resolvidas        : ${collisions}  ← exigem decisão manual`);

  if (!APPLY && needFix > 0) {
    console.log('\nPara aplicar:  node scripts/diagnose-billing-cycle.mjs --apply');
    console.log('Recomendado: fazer backup/snapshot do banco antes.');
  }
  if (APPLY) console.log(`Faturas atualizadas            : ${applied}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
