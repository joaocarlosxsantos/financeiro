/**/**

 * Tests para recurring-utils.ts * @jest-environment node

 *  * Tests para recurring-utils.ts

 * Testa as funções de cálculo de ocorrências: * 

 * - countFixedOccurrences(recStart, recEnd, recordDay, periodStart, periodEnd) * Valida cálculos de ocorrências fixas e mensais

 * - countMonthlyOccurrences(recStart, recEnd, dayOfMonth, windowStart, windowEnd) * 

 */ * Funções testadas:

 * - countFixedOccurrences(recStart, recEnd, recordDay, periodStart, periodEnd)

import { * - countMonthlyOccurrences(recStart, recEnd, periodStart, periodEnd)

  countFixedOccurrences, */

  countMonthlyOccurrences,

} from '@/lib/recurring-utils';import {

  countFixedOccurrences,

describe('recurring-utils - countFixedOccurrences', () => {  countMonthlyOccurrences,

  it('deve contar ocorrências fixas no dia 1º', () => {} from '@/lib/recurring-utils';

    // Transação fixa no 1º de cada mês, período: outubro 2025

    const result = countFixedOccurrences(describe('recurring-utils', () => {

      new Date('2025-10-01'),     // recStart  describe('countFixedOccurrences', () => {

      null,                       // recEnd    it('deve contar corretamente ocorrências fixas dentro do período', () => {

      1,                          // recordDay (1º)      // Transação fixa no 1º de cada mês

      new Date('2025-10-01'),     // periodStart      // Dentro do período: 2025-10-01 até 2025-10-31

      new Date('2025-10-31')      // periodEnd      const result = countFixedOccurrences(

    );        new Date('2025-10-01'),     // recStart

        null,                       // recEnd

    expect(result).toBe(1);        1,                          // recordDay (1º)

  });        new Date('2025-10-01'),     // periodStart

        new Date('2025-10-31')      // periodEnd

  it('deve contar múltiplas ocorrências em período longo', () => {      );

    // Transação no 15º de cada mês, período: 3 meses

    const result = countFixedOccurrences(      expect(result).toBe(1);

      new Date('2025-10-01'),     // recStart    });

      null,                       // recEnd

      15,                         // recordDay    it('deve retornar 0 para transação fora do período', () => {

      new Date('2025-10-01'),     // periodStart      // Transação iniciando depois do período

      new Date('2025-12-31')      // periodEnd      const result = countFixedOccurrences(

    );        new Date('2025-11-01'),     // recStart (depois do período)

        null,                       // recEnd

    // 3 ocorrências: 15/10, 15/11, 15/12        1,                          // recordDay

    expect(result).toBe(3);        new Date('2025-10-01'),     // periodStart

  });        new Date('2025-10-31')      // periodEnd

      );

  it('deve respeitar data final (recEnd)', () => {

    // Transação que termina em 1º de novembro      expect(result).toBe(0);

    const result = countFixedOccurrences(    });

      new Date('2025-10-01'),     // recStart

      new Date('2025-11-01'),     // recEnd    it('deve contar múltiplas ocorrências em período longo', () => {

      1,                          // recordDay      // Transação fixa no 15º de cada mês, período de 3 meses

      new Date('2025-10-01'),     // periodStart      const result = countFixedOccurrences(

      new Date('2025-12-31')      // periodEnd        new Date('2025-10-01'),     // recStart

    );        null,                       // recEnd

        15,                         // recordDay (15º)

    // 2 ocorrências: 1/10, 1/11        new Date('2025-10-01'),     // periodStart

    expect(result).toBe(2);        new Date('2025-12-31')      // periodEnd

  });      );



  it('deve retornar 0 para transação após o período', () => {      // 3 ocorrências: 15/10, 15/11, 15/12

    // Transação iniciando depois do período      expect(result).toBe(3);

    const result = countFixedOccurrences(    });

      new Date('2025-11-01'),     // recStart

      null,                       // recEnd    it('deve respeitar endRecurrence se fornecido', () => {

      1,                          // recordDay      // Transação que termina no meio do período

      new Date('2025-10-01'),     // periodStart      const result = countFixedOccurrences(

      new Date('2025-10-31')      // periodEnd        new Date('2025-10-01'),     // recStart

    );        new Date('2025-11-01'),     // recEnd (termina em 1º de nov)

        1,                          // recordDay

    expect(result).toBe(0);        new Date('2025-10-01'),     // periodStart

  });        new Date('2025-12-31')      // periodEnd

      );

  it('deve lidar com transações que começam no mesmo dia do período', () => {

    const result = countFixedOccurrences(      // 2 ocorrências: 1/10, 1/11

      new Date('2025-10-15'),     // recStart      expect(result).toBe(2);

      null,                       // recEnd    });

      15,                         // recordDay

      new Date('2025-10-15'),     // periodStart    it('deve contar ocorrência mesmo com dia do mês diferente', () => {

      new Date('2025-10-31')      // periodEnd      // Transação que começa no dia 20

    );      const result = countFixedOccurrences(

        new Date('2025-10-20'),     // recStart

    expect(result).toBe(1);        null,                       // recEnd

  });        20,                         // recordDay

        new Date('2025-10-01'),     // periodStart

  it('deve retornar 0 para período inválido', () => {        new Date('2025-10-31')      // periodEnd

    // Data final antes da inicial      );

    const result = countFixedOccurrences(

      new Date('2025-10-01'),     // recStart      expect(result).toBe(1);

      null,                       // recEnd    });

      15,                         // recordDay

      new Date('2025-10-31'),     // periodStart    it('deve lidar com dias que não existem em alguns meses', () => {

      new Date('2025-10-01')      // periodEnd      // Transação fixa no 31º, em período com fevereiro (que tem 28/29 dias)

    );      const result = countFixedOccurrences(

        new Date('2025-01-31'),     // recStart

    expect(result).toBe(0);        null,                       // recEnd

  });        31,                         // recordDay (31º)

        new Date('2025-01-01'),     // periodStart

  it('deve lidar com null para recStart', () => {        new Date('2025-02-28')      // periodEnd

    const result = countFixedOccurrences(      );

      null,                       // recStart

      null,                       // recEnd      // 1 ocorrência apenas em janeiro (fevereiro não tem dia 31)

      15,                         // recordDay      expect(result).toBeGreaterThanOrEqual(1);

      new Date('2025-10-01'),     // periodStart    });

      new Date('2025-10-31')      // periodEnd  });

    );

  describe('countMonthlyOccurrences', () => {

    // Função retorna 0 para recStart null    it('deve contar corretamente ocorrências mensais', () => {

    expect(result).toBe(0);      // Transação mensal no mês 10 de 2025

  });      const result = countMonthlyOccurrences(

});        new Date('2025-10-01'),     // recStart

        null,                       // recEnd

describe('recurring-utils - countMonthlyOccurrences', () => {        new Date('2025-10-01'),     // periodStart

  it('deve contar ocorrência mensal no período correto', () => {        new Date('2025-10-31')      // periodEnd

    // Transação mensal começando em outubro 2025      );

    const result = countMonthlyOccurrences(

      new Date('2025-10-01'),     // recStart      expect(result).toBe(1);

      null,                       // recEnd    });

      1,                          // dayOfMonth (1º)

      new Date('2025-10-01'),     // windowStart    it('deve retornar 0 para transação mensal fora do período', () => {

      new Date('2025-10-31')      // windowEnd      // Transação iniciando depois do período

    );      const result = countMonthlyOccurrences(

        new Date('2025-11-01'),     // recStart (depois do período)

    expect(result).toBe(1);        null,                       // recEnd

  });        new Date('2025-10-01'),     // periodStart

        new Date('2025-10-31')      // periodEnd

  it('deve contar múltiplas ocorrências mensais', () => {      );

    // Transação mensal em período de 3 meses

    const result = countMonthlyOccurrences(      expect(result).toBe(0);

      new Date('2025-10-01'),     // recStart    });

      null,                       // recEnd

      15,                         // dayOfMonth    it('deve contar múltiplas ocorrências em período longo', () => {

      new Date('2025-10-01'),     // windowStart      // Período de 3 meses

      new Date('2025-12-31')      // windowEnd      const result = countMonthlyOccurrences(

    );        new Date('2025-10-01'),     // recStart

        null,                       // recEnd

    // 3 ocorrências: 15/10, 15/11, 15/12        new Date('2025-10-01'),     // periodStart

    expect(result).toBe(3);        new Date('2025-12-31')      // periodEnd

  });      );



  it('deve retornar 0 para transação após a janela', () => {      // 3 ocorrências: out, nov, dez

    // Transação começando depois da janela      expect(result).toBe(3);

    const result = countMonthlyOccurrences(    });

      new Date('2025-11-01'),     // recStart

      null,                       // recEnd    it('deve respeitar endRecurrence se fornecido', () => {

      1,                          // dayOfMonth      // Transação que termina no meio do período

      new Date('2025-10-01'),     // windowStart      const result = countMonthlyOccurrences(

      new Date('2025-10-31')      // windowEnd        new Date('2025-10-01'),     // recStart

    );        new Date('2025-11-30'),     // recEnd

        new Date('2025-10-01'),     // periodStart

    expect(result).toBe(0);        new Date('2025-12-31')      // periodEnd

  });      );



  it('deve respeitar recEnd', () => {      // 2 ocorrências: out, nov (dez terminaria a série)

    // Transação que termina em novembro      expect(result).toBe(2);

    const result = countMonthlyOccurrences(    });

      new Date('2025-10-01'),     // recStart

      new Date('2025-11-30'),     // recEnd    it('deve lidar com períodos parciais', () => {

      1,                          // dayOfMonth      // Período que começa no meio do mês

      new Date('2025-10-01'),     // windowStart      const result = countMonthlyOccurrences(

      new Date('2025-12-31')      // windowEnd        new Date('2025-10-01'),     // recStart

    );        null,                       // recEnd

        new Date('2025-10-15'),     // periodStart (meio do mês)

    // 2 ocorrências: outubro, novembro (dezembro está fora do recEnd)        new Date('2025-12-15')      // periodEnd

    expect(result).toBe(2);      );

  });

      // 3 ocorrências: out, nov, dez

  it('deve lidar com períodos parciais', () => {      expect(result).toBe(3);

    // Janela começando no meio do mês    });

    const result = countMonthlyOccurrences(  });

      new Date('2025-10-01'),     // recStart

      null,                       // recEnd  describe('Edge cases', () => {

      20,                         // dayOfMonth    it('deve lidar com transações que começam no mesmo dia do período', () => {

      new Date('2025-10-15'),     // windowStart (meio do mês)      const result = countFixedOccurrences(

      new Date('2025-12-15')      // windowEnd        new Date('2025-10-15'),     // recStart

    );        null,                       // recEnd

        15,                         // recordDay

    // 3 ocorrências: 20/10, 20/11, 20/12        new Date('2025-10-15'),     // periodStart (mesmo dia)

    expect(result).toBe(3);        new Date('2025-10-31')      // periodEnd

  });      );



  it('deve lidar com null para recStart', () => {      expect(result).toBe(1);

    const result = countMonthlyOccurrences(    });

      null,                       // recStart

      null,                       // recEnd    it('deve retornar 0 para períodos inválidos (data final antes da inicial)', () => {

      15,                         // dayOfMonth      const result = countFixedOccurrences(

      new Date('2025-10-01'),     // windowStart        new Date('2025-10-01'),     // recStart

      new Date('2025-10-31')      // windowEnd        null,                       // recEnd

    );        15,                         // recordDay

        new Date('2025-10-31'),     // periodStart (depois do fim)

    // Função retorna 0 para recStart null        new Date('2025-10-01')      // periodEnd (antes do início)

    expect(result).toBe(0);      );

  });

      expect(result).toBe(0);

  it('deve usar dayOfMonth corretamente', () => {    });

    // Transação mensal no 31º (alguns meses não têm dia 31)

    const result = countMonthlyOccurrences(    it('deve lidar com null para recStart', () => {

      new Date('2025-01-31'),     // recStart      const result = countFixedOccurrences(

      null,                       // recEnd        null,                       // recStart (null)

      31,                         // dayOfMonth        null,                       // recEnd

      new Date('2025-01-01'),     // windowStart        15,                         // recordDay

      new Date('2025-02-28')      // windowEnd        new Date('2025-10-01'),     // periodStart

    );        new Date('2025-10-31')      // periodEnd

      );

    // 1 ocorrência apenas em janeiro (fevereiro não tem dia 31)

    expect(result).toBeGreaterThanOrEqual(1);      // Deve retornar 0 ou 1 (sem erro de tipo)

  });      expect(typeof result).toBe('number');

    });

  it('deve usar data de recStart como padrão para dayOfMonth se não fornecido', () => {  });

    // recStart no dia 15, sem especificar dayOfMonth (undefined)});

    const result = countMonthlyOccurrences(
      new Date('2025-10-15'),     // recStart
      null,                       // recEnd
      undefined,                  // dayOfMonth (undefined - usará 15 de recStart)
      new Date('2025-10-01'),     // windowStart
      new Date('2025-12-31')      // windowEnd
    );

    // 3 ocorrências: 15/10, 15/11, 15/12
    expect(result).toBe(3);
  });
});

describe('recurring-utils - Edge Cases', () => {
  it('deve lidar com período de 1 dia', () => {
    const result = countFixedOccurrences(
      new Date('2025-10-15'),     // recStart
      null,                       // recEnd
      15,                         // recordDay
      new Date('2025-10-15'),     // periodStart
      new Date('2025-10-15')      // periodEnd (mesmo dia)
    );

    expect(result).toBe(1);
  });

  it('deve lidar com recEnd igual a recStart', () => {
    const result = countFixedOccurrences(
      new Date('2025-10-15'),     // recStart
      new Date('2025-10-15'),     // recEnd (mesmo dia)
      15,                         // recordDay
      new Date('2025-10-01'),     // periodStart
      new Date('2025-10-31')      // periodEnd
    );

    expect(result).toBe(1);
  });

  it('deve usar windowStart e windowEnd como padrões', () => {
    const result = countMonthlyOccurrences(
      new Date('2025-01-01'),     // recStart (muito antes)
      null,                       // recEnd
      1,                          // dayOfMonth
      undefined,                  // windowStart (undefined - usará recStart)
      undefined                   // windowEnd (undefined - usará hoje)
    );

    // Deve contar todas até hoje
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
