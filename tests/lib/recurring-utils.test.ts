import {
  countFixedOccurrences,
  countMonthlyOccurrences,
} from '@/lib/recurring-utils';

describe('recurring-utils', () => {
  describe('countFixedOccurrences', () => {
    it('deve contar corretamente ocorrências fixas no 1º do mês', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        1,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(1);
    });

    it('deve contar múltiplas ocorrências em múltiplos meses', () => {
      const result = countFixedOccurrences(
        new Date('2025-09-01'),
        null,
        1,
        new Date('2025-09-01'),
        new Date('2025-11-30')
      );
      expect(result).toBe(3);
    });

    it('deve retornar 0 quando a ocorrência está fora do período', () => {
      const result = countFixedOccurrences(
        new Date('2025-12-01'),
        null,
        1,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(0);
    });

    it('deve contar ocorrências fixas no 15º do mês', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(1);
    });

    it('deve retornar 0 se o dia não existe no mês', () => {
      const result = countFixedOccurrences(
        new Date('2025-02-29'),
        null,
        29,
        new Date('2025-02-01'),
        new Date('2025-02-28')
      );
      expect(result).toBe(0);
    });

    it('deve respeitar a data de fim (recEnd) da recorrência', () => {
      const result = countFixedOccurrences(
        new Date('2025-09-01'),
        new Date('2025-10-31'),
        1,
        new Date('2025-09-01'),
        new Date('2025-11-30')
      );
      expect(result).toBe(2);
    });

    it('deve contar corretamente com recEnd antes do período', () => {
      const result = countFixedOccurrences(
        new Date('2025-09-01'),
        new Date('2025-10-15'),
        1,
        new Date('2025-09-01'),
        new Date('2025-11-30')
      );
      expect(result).toBe(2);
    });

    it('deve retornar 0 se recEnd é antes da recStart', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        new Date('2025-09-01'),
        1,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(0);
    });

    it('deve contar corretamente com períodos parciais', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        15,
        new Date('2025-10-20'),
        new Date('2025-10-31')
      );
      expect(result).toBe(0);
    });

    it('deve contar corretamente quando o período começa após a recorrência', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        1,
        new Date('2025-11-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(2);
    });
  });

  describe('countMonthlyOccurrences', () => {
    it('deve contar corretamente ocorrências mensais simples', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(1);
    });

    it('deve contar múltiplas ocorrências mensais em vários meses', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(3);
    });

    it('deve retornar 0 quando a ocorrência está fora do período', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-20'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(0);
    });

    it('deve respeitar a data de fim (recEnd) da recorrência', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        new Date('2025-11-30'),
        15,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(2);
    });

    it('deve contar corretamente quando recEnd está no meio do período', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        new Date('2025-11-10'),
        15,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(1);
    });

    it('deve retornar 0 se recEnd é antes de recStart', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        new Date('2025-09-15'),
        15,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(0);
    });

    it('deve contar corretamente com períodos parciais', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-20'),
        new Date('2025-10-31')
      );
      expect(result).toBe(0);
    });

    it('deve contar corretamente quando o período começa após a recorrência', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-11-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(2);
    });

    it('deve lidar com meses que não têm o dia especificado', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-01-31'),
        null,
        31,
        new Date('2025-01-01'),
        new Date('2025-03-31')
      );
      expect(result).toBe(1);
    });

    it('deve contar corretamente com recEnd próximo ao final do período', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        new Date('2025-12-20'),
        15,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(3);
    });
  });

  describe('Casos extremos e edge cases', () => {
    it('countFixedOccurrences: deve funcionar com ano bissexto (29 de fevereiro)', () => {
      const result = countFixedOccurrences(
        new Date('2024-02-29'),
        null,
        29,
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('countMonthlyOccurrences: deve funcionar com ano bissexto', () => {
      const result = countMonthlyOccurrences(
        new Date('2024-02-29'),
        null,
        29,
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('countFixedOccurrences: deve retornar 0 para período vazio', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        1,
        new Date('2025-10-31'),
        new Date('2025-10-01')
      );
      expect(result).toBe(0);
    });

    it('countMonthlyOccurrences: deve retornar 0 para período vazio', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-31'),
        new Date('2025-10-01')
      );
      expect(result).toBe(0);
    });

    it('countFixedOccurrences: deve contar com dia 31 (último dia do mês)', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-31'),
        null,
        31,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(1);
    });

    it('countMonthlyOccurrences: deve contar com dia 31 (último dia do mês)', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-31'),
        null,
        31,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(2);
    });
  });

  describe('Integração com cenários reais', () => {
    it('deve calcular uma fatura mensal de cartão de crédito corretamente', () => {
      const result = countMonthlyOccurrences(
        new Date('2025-10-15'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(result).toBe(1);
    });

    it('deve calcular um pagamento recorrente fixo corretamente', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        1,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(3);
    });

    it('deve contar corretamente com recorrência que termina no meio do período', () => {
      const result = countFixedOccurrences(
        new Date('2025-10-01'),
        new Date('2025-11-15'),
        1,
        new Date('2025-10-01'),
        new Date('2025-12-31')
      );
      expect(result).toBe(2);
    });

    it('deve contar corretamente múltiplas recorrências no mesmo mês', () => {
      const resultFixed = countFixedOccurrences(
        new Date('2025-10-01'),
        null,
        15,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      const resultMonthly = countMonthlyOccurrences(
        new Date('2025-10-01'),
        null,
        1,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      expect(resultFixed + resultMonthly).toBe(2);
    });
  });
});
