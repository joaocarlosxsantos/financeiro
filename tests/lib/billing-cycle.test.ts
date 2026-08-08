import {
  clampDayToMonth,
  lastDayOfMonth,
  dueFallsInClosingMonth,
  getCycleByClosingMonth,
  getCycleByDueMonth,
  resolveBillingCycle,
  getInstallmentCycles,
  assertValidCard,
  type BillingCard,
} from '@/lib/billing-cycle';

/** Formata como DD/MM/YYYY lendo em UTC — a convenção do módulo. */
const fmt = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

/** Data de compra em UTC ao meio-dia. */
const at = (y: number, m1: number, d: number) => new Date(Date.UTC(y, m1 - 1, d, 12, 0, 0));

/** Data de compra como o app realmente a recebe: `<input type="date">` → meia-noite UTC. */
const fromDateInput = (iso: string) => new Date(iso);

// Cartões de referência. Os dois primeiros cobrem as duas topologias possíveis.
const FECHA30_VENCE07: BillingCard = { closingDay: 30, dueDay: 7 }; // vencimento no mês seguinte
const FECHA05_VENCE15: BillingCard = { closingDay: 5, dueDay: 15 }; // vencimento no mesmo mês
const FECHA31_VENCE10: BillingCard = { closingDay: 31, dueDay: 10 }; // dia inexistente em vários meses

describe('independência de timezone (o servidor roda em UTC, o dev em UTC-3)', () => {
  test('as datas são construídas em UTC ao meio-dia', () => {
    const c = getCycleByClosingMonth(FECHA30_VENCE07, 2026, 6);
    expect(c.closingDate.toISOString()).toBe('2026-07-30T12:00:00.000Z');
    expect(c.dueDate.toISOString()).toBe('2026-08-07T12:00:00.000Z');
  });

  test('meio-dia UTC sobrevive à exibição com getters locais em UTC-3', () => {
    // Meia-noite UTC apareceria como o DIA ANTERIOR em qualquer formatação local em
    // UTC-3 — foi o que aconteceu com os dados legados. Meio-dia dá 12h de folga.
    const c = getCycleByClosingMonth(FECHA30_VENCE07, 2026, 6);
    const emSaoPaulo = c.closingDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    expect(emSaoPaulo).toBe('30/07/2026');
  });

  test('REGRESSÃO: compra vinda de <input type="date"> não escorrega um dia', () => {
    // `new Date('2026-07-30')` é meia-noite UTC. Lido com getUTCDate() → 30 (correto).
    // Lido com getDate() em UTC-3 → 29, o que jogaria a compra para a fatura seguinte,
    // já que 30 é exatamente o dia de fechamento deste cartão.
    const c = resolveBillingCycle(FECHA30_VENCE07, fromDateInput('2026-07-30'));
    expect(fmt(c.closingDate)).toBe('30/07/2026');
    expect(fmt(c.dueDate)).toBe('07/08/2026');
  });

  test('o instante calculado não depende do TZ do processo', () => {
    // Vale porque o módulo só usa Date.UTC/getUTC*: o valor é uma função pura dos
    // números de entrada, sem leitura do fuso do ambiente.
    const iso = (tz: string) => {
      const original = process.env.TZ;
      process.env.TZ = tz;
      const result = getCycleByClosingMonth(FECHA30_VENCE07, 2026, 6).closingDate.toISOString();
      process.env.TZ = original;
      return result;
    };
    expect(iso('UTC')).toBe(iso('America/Sao_Paulo'));
    expect(iso('UTC')).toBe(iso('Asia/Tokyo'));
  });
});

describe('lastDayOfMonth / clampDayToMonth', () => {
  test.each([
    [2026, 0, 31], // jan
    [2026, 1, 28], // fev (não bissexto)
    [2024, 1, 29], // fev (bissexto)
    [2026, 3, 30], // abr
  ])('lastDayOfMonth(%i, %i) = %i', (year, month, expected) => {
    expect(lastDayOfMonth(year, month)).toBe(expected);
  });

  test('trunca o dia ao último do mês SEM transbordar para o mês seguinte', () => {
    // Regressão do bug original: new Date(2026,1,31) rolava para 03/mar e o
    // setDate(28) posterior gravava 28/MAR.
    expect(fmt(clampDayToMonth(2026, 1, 31))).toBe('28/02/2026');
    expect(fmt(clampDayToMonth(2024, 1, 31))).toBe('29/02/2024');
    expect(fmt(clampDayToMonth(2026, 3, 31))).toBe('30/04/2026');
  });

  test('mantém o dia quando ele existe no mês', () => {
    expect(fmt(clampDayToMonth(2026, 0, 31))).toBe('31/01/2026');
    expect(fmt(clampDayToMonth(2026, 6, 15))).toBe('15/07/2026');
  });

  test('normaliza meses fora de 0-11', () => {
    expect(fmt(clampDayToMonth(2026, 12, 10))).toBe('10/01/2027');
    expect(fmt(clampDayToMonth(2026, -1, 10))).toBe('10/12/2025');
    expect(fmt(clampDayToMonth(2026, 25, 5))).toBe('05/02/2028');
  });
});

describe('assertValidCard', () => {
  test.each([0, 32, 1.5, NaN])('rejeita closingDay inválido: %s', (day) => {
    expect(() => assertValidCard({ closingDay: day as number, dueDay: 10 })).toThrow(RangeError);
  });

  test.each([0, 32, -3])('rejeita dueDay inválido: %s', (day) => {
    expect(() => assertValidCard({ closingDay: 10, dueDay: day as number })).toThrow(RangeError);
  });

  test('aceita os limites 1 e 31', () => {
    expect(() => assertValidCard({ closingDay: 1, dueDay: 31 })).not.toThrow();
    expect(() => assertValidCard({ closingDay: 31, dueDay: 1 })).not.toThrow();
  });
});

describe('dueFallsInClosingMonth', () => {
  test('vencimento no mesmo mês quando dueDay > closingDay', () => {
    expect(dueFallsInClosingMonth(FECHA05_VENCE15)).toBe(true);
  });

  test('vencimento no mês seguinte quando dueDay <= closingDay', () => {
    expect(dueFallsInClosingMonth(FECHA30_VENCE07)).toBe(false);
    expect(dueFallsInClosingMonth({ closingDay: 10, dueDay: 10 })).toBe(false);
  });
});

describe('getCycleByClosingMonth', () => {
  test('fecha 30 / vence 07 → vencimento no mês seguinte', () => {
    const c = getCycleByClosingMonth(FECHA30_VENCE07, 2026, 0); // fecha em janeiro
    expect(fmt(c.closingDate)).toBe('30/01/2026');
    expect(fmt(c.dueDate)).toBe('07/02/2026');
    expect(c.billKey).toBe('2026-01');
  });

  test('fecha 05 / vence 15 → vencimento no mesmo mês', () => {
    const c = getCycleByClosingMonth(FECHA05_VENCE15, 2026, 0);
    expect(fmt(c.closingDate)).toBe('05/01/2026');
    expect(fmt(c.dueDate)).toBe('15/01/2026');
    expect(c.billKey).toBe('2026-01');
  });

  test('REGRESSÃO: fecha 31 em fevereiro não escorrega para março', () => {
    const c = getCycleByClosingMonth(FECHA31_VENCE10, 2026, 1);
    expect(fmt(c.closingDate)).toBe('28/02/2026');
    expect(fmt(c.dueDate)).toBe('10/03/2026');
    expect(c.billKey).toBe('2026-02');
  });

  test('atravessa a virada de ano', () => {
    const c = getCycleByClosingMonth(FECHA30_VENCE07, 2026, 11); // fecha em dezembro
    expect(fmt(c.closingDate)).toBe('30/12/2026');
    expect(fmt(c.dueDate)).toBe('07/01/2027');
    expect(c.billKey).toBe('2026-12');
  });
});

describe('getCycleByDueMonth (identifica a fatura pelo mês de vencimento)', () => {
  test('fecha 30 / vence 07: fatura que vence em fevereiro fecha em janeiro', () => {
    const c = getCycleByDueMonth(FECHA30_VENCE07, 2026, 1);
    expect(fmt(c.closingDate)).toBe('30/01/2026');
    expect(fmt(c.dueDate)).toBe('07/02/2026');
  });

  test('fecha 05 / vence 15: fatura que vence em fevereiro fecha em fevereiro', () => {
    const c = getCycleByDueMonth(FECHA05_VENCE15, 2026, 1);
    expect(fmt(c.closingDate)).toBe('05/02/2026');
    expect(fmt(c.dueDate)).toBe('15/02/2026');
  });

  test('REGRESSÃO: fecha 31 / vence 10, fatura que vence em MARÇO fecha em 28/FEV', () => {
    // O código antigo devolvia 28/03/2026 aqui — um mês inteiro de erro.
    const c = getCycleByDueMonth(FECHA31_VENCE10, 2026, 2);
    expect(fmt(c.closingDate)).toBe('28/02/2026');
    expect(fmt(c.dueDate)).toBe('10/03/2026');
  });

  test('é o inverso de getCycleByClosingMonth', () => {
    for (const card of [FECHA30_VENCE07, FECHA05_VENCE15, FECHA31_VENCE10]) {
      for (let m = 0; m < 12; m++) {
        const byClosing = getCycleByClosingMonth(card, 2026, m);
        const roundTrip = getCycleByDueMonth(
          card,
          byClosing.dueDate.getFullYear(),
          byClosing.dueDate.getMonth(),
        );
        expect(roundTrip.billKey).toBe(byClosing.billKey);
      }
    }
  });
});

describe('resolveBillingCycle — a qual fatura a compra pertence', () => {
  describe('fecha 30 / vence 07 (comportamento documentado no código antigo)', () => {
    test.each([
      ['compra antes do fechamento', at(2026, 1, 5), '07/02/2026'],
      ['compra na véspera do fechamento', at(2026, 1, 29), '07/02/2026'],
      ['compra NO dia do fechamento entra na fatura atual', at(2026, 1, 30), '07/02/2026'],
      ['compra depois do fechamento pula uma fatura', at(2026, 1, 31), '07/03/2026'],
    ])('%s', (_label, purchase, expectedDue) => {
      expect(fmt(resolveBillingCycle(FECHA30_VENCE07, purchase).dueDate)).toBe(expectedDue);
    });
  });

  describe('REGRESSÃO fecha 05 / vence 15 — vencimento no mesmo mês do fechamento', () => {
    // O código antigo somava sempre +1/+2 meses e devolvia 15/02 e 15/03 aqui.
    test('compra em 03/jan vence em 15/jan (não 15/fev)', () => {
      const c = resolveBillingCycle(FECHA05_VENCE15, at(2026, 1, 3));
      expect(fmt(c.closingDate)).toBe('05/01/2026');
      expect(fmt(c.dueDate)).toBe('15/01/2026');
    });

    test('compra em 06/jan vence em 15/fev (não 15/mar)', () => {
      const c = resolveBillingCycle(FECHA05_VENCE15, at(2026, 1, 6));
      expect(fmt(c.closingDate)).toBe('05/02/2026');
      expect(fmt(c.dueDate)).toBe('15/02/2026');
    });
  });

  describe('REGRESSÃO fecha 31 — o cartão precisa fechar mesmo em meses curtos', () => {
    test('compra em 27/fev entra na fatura que fecha 28/fev', () => {
      const c = resolveBillingCycle(FECHA31_VENCE10, at(2026, 2, 27));
      expect(fmt(c.closingDate)).toBe('28/02/2026');
      expect(fmt(c.dueDate)).toBe('10/03/2026');
    });

    test('compra em 28/fev (último dia = fechamento efetivo) ainda entra na fatura de fevereiro', () => {
      const c = resolveBillingCycle(FECHA31_VENCE10, at(2026, 2, 28));
      expect(fmt(c.closingDate)).toBe('28/02/2026');
    });

    test('compra em 01/mar entra na fatura que fecha 31/mar', () => {
      const c = resolveBillingCycle(FECHA31_VENCE10, at(2026, 3, 1));
      expect(fmt(c.closingDate)).toBe('31/03/2026');
      expect(fmt(c.dueDate)).toBe('10/04/2026');
    });
  });

  test('compra em dezembro depois do fechamento vira fatura de janeiro', () => {
    const c = resolveBillingCycle(FECHA30_VENCE07, at(2026, 12, 31));
    expect(fmt(c.closingDate)).toBe('30/01/2027');
    expect(fmt(c.dueDate)).toBe('07/02/2027');
  });

  test('rejeita data inválida', () => {
    expect(() => resolveBillingCycle(FECHA30_VENCE07, new Date('lixo'))).toThrow(TypeError);
  });

  describe('propriedades invariantes sobre a matriz closingDay × dueDay × dia da compra', () => {
    const days = [1, 2, 5, 10, 15, 20, 25, 28, 29, 30, 31];

    test('o vencimento nunca é anterior ao fechamento', () => {
      for (const closingDay of days) {
        for (const dueDay of days) {
          for (let month = 0; month < 12; month++) {
            const c = getCycleByClosingMonth({ closingDay, dueDay }, 2026, month);
            expect(c.dueDate.getTime()).toBeGreaterThanOrEqual(c.closingDate.getTime());
          }
        }
      }
    });

    test('o fechamento nunca é anterior à compra', () => {
      for (const closingDay of days) {
        for (const dueDay of days) {
          for (let month = 1; month <= 12; month++) {
            const maxDay = lastDayOfMonth(2026, month - 1);
            for (const day of days.filter((d) => d <= maxDay)) {
              const purchase = at(2026, month, day);
              const c = resolveBillingCycle({ closingDay, dueDay }, purchase);
              // Compara por dia (ambos ao meio-dia), não por instante exato.
              expect(c.closingDate.getTime()).toBeGreaterThanOrEqual(purchase.getTime());
            }
          }
        }
      }
    });

    test('a fatura nunca fica a mais de ~2 meses da compra', () => {
      for (const closingDay of days) {
        for (const dueDay of days) {
          const purchase = at(2026, 6, 15);
          const c = resolveBillingCycle({ closingDay, dueDay }, purchase);
          const diffDays = (c.dueDate.getTime() - purchase.getTime()) / 86_400_000;
          expect(diffDays).toBeLessThanOrEqual(70);
        }
      }
    });
  });
});

describe('getInstallmentCycles', () => {
  test('parcelas caem em ciclos consecutivos', () => {
    const cycles = getInstallmentCycles(FECHA30_VENCE07, at(2026, 1, 5), 3, 300);
    expect(cycles.map((c) => fmt(c.dueDate))).toEqual([
      '07/02/2026',
      '07/03/2026',
      '07/04/2026',
    ]);
    expect(cycles.map((c) => c.installmentNumber)).toEqual([1, 2, 3]);
    expect(cycles.every((c) => c.installmentCount === 3)).toBe(true);
  });

  test('REGRESSÃO: primeira parcela de cartão que vence no mesmo mês não atrasa', () => {
    const cycles = getInstallmentCycles(FECHA05_VENCE15, at(2026, 1, 3), 2, 200);
    expect(cycles.map((c) => fmt(c.dueDate))).toEqual(['15/01/2026', '15/02/2026']);
  });

  test('a soma das parcelas é exatamente o total (resíduo na última)', () => {
    const cycles = getInstallmentCycles(FECHA30_VENCE07, at(2026, 1, 5), 3, 100);
    expect(cycles.map((c) => c.amount)).toEqual([33.33, 33.33, 33.34]);
    const sum = cycles.reduce((s, c) => s + c.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  test.each([
    [1, 99.99],
    [2, 0.01],
    [7, 1000],
    [12, 1234.56],
    [24, 999.99],
  ])('soma fecha para %i parcelas de um total de %f', (count, total) => {
    const cycles = getInstallmentCycles(FECHA30_VENCE07, at(2026, 1, 15), count, total);
    expect(cycles).toHaveLength(count);
    const sum = cycles.reduce((s, c) => s + c.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(total);
  });

  test('parcelamento longo atravessa a virada de ano corretamente', () => {
    const cycles = getInstallmentCycles(FECHA30_VENCE07, at(2026, 11, 5), 4, 400);
    expect(cycles.map((c) => fmt(c.dueDate))).toEqual([
      '07/12/2026',
      '07/01/2027',
      '07/02/2027',
      '07/03/2027',
    ]);
  });

  test('cada parcela cai num ciclo distinto (billKey único)', () => {
    const cycles = getInstallmentCycles(FECHA31_VENCE10, at(2026, 1, 10), 12, 1200);
    expect(new Set(cycles.map((c) => c.billKey)).size).toBe(12);
  });

  test('rejeita contagem de parcelas inválida', () => {
    expect(() => getInstallmentCycles(FECHA30_VENCE07, at(2026, 1, 5), 0, 100)).toThrow(RangeError);
    expect(() => getInstallmentCycles(FECHA30_VENCE07, at(2026, 1, 5), 2.5, 100)).toThrow(RangeError);
  });
});
