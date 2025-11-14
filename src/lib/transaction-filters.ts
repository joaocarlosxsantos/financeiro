/**
 * Expande registros recorrentes em todas as ocorrências do mês consultado.
 * Para cada registro recorrente, gera uma ocorrência para cada dia de vigência no mês.
 * Pontuais são mantidos como estão.
 * 
 * REGRA IMPORTANTE: 
 * - Inclui recorrentes com endDate = null (vigentes indefinidamente)
 * - Inclui recorrentes com endDate >= último dia do mês selecionado
 * - Para meses anteriores ao atual, considera o mês completo
 * - Para o mês atual, limita até o dia de hoje
 * 
 * @param records Lista de transações (pontuais e recorrentes)
 * @param year Ano do mês de referência
 * @param month Mês de referência (1-12)
 * @param today Data de hoje (para limitar recorrentes no mês atual)
 * @returns Lista expandida de transações
 */
export function expandRecurringAllOccurrencesForMonth<T extends { type: string; date: Date|string; endDate?: Date|string|null }>(
  records: T[],
  year: number,
  month: number,
  today: Date
): T[] {
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const { startDate, endDate } = getEffectiveDateRange(year, month);
  
  // Para meses anteriores, considera o último dia do mês
  // Para o mês atual, limita ao dia de hoje
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const dayLimit = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  
  const result: T[] = [];
  
  for (const rec of records) {
    if (rec.type === 'RECURRING') {
      const recStart = new Date(rec.date);
      const recDay = recStart.getDate();
      
      // Calcular o dia válido no mês (considerando meses com menos dias)
      const validDay = Math.min(recDay, lastDayOfMonth);
      
      // Data da ocorrência neste mês
      const occDate = new Date(year, month - 1, validDay);
      
      // VALIDAÇÃO 1: A recorrência já começou?
      if (occDate < recStart) continue;
      
      // VALIDAÇÃO 2: Para mês atual, só inclui até o dia de hoje
      if (isCurrentMonth && validDay > dayLimit) continue;
      
      // VALIDAÇÃO 3: Verificar endDate
      if (rec.endDate) {
        const endDateObj = new Date(rec.endDate);
        
        // Se endDate é antes do início do mês, ignora completamente
        if (endDateObj < startDate) continue;
        
        // Se endDate é antes da data da ocorrência, ignora
        if (occDate > endDateObj) continue;
      }
      // Se endDate é null, inclui sempre (enquanto estiver dentro do período válido)
      
      // Inclui a ocorrência
      result.push({ ...rec, date: occDate } as T);
      
    } else {
      // Pontual: mantém como está
      result.push(rec);
    }
  }
  
  return result;
}
/**
 * Expande registros recorrentes em ocorrências reais do mês consultado.
 * Para cada registro recorrente, gera uma ocorrência para o mês/dia válido.
 * Pontuais são mantidos como estão.
 */
export function expandRecurringForMonth<T extends { type: string; date: Date|string; endDate?: Date|string|null }>(
  records: T[],
  year: number,
  month: number,
  today: Date
): T[] {
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const { startDate, endDate } = getEffectiveDateRange(year, month);
  const dayLimit = isCurrentMonth ? today.getDate() : 31;
  const result: T[] = [];
  for (const rec of records) {
    if (rec.type === 'RECURRING') {
      // Se tem endDate e ela é menor que o início do mês, ignora
      if (rec.endDate) {
        const endDateObj = new Date(rec.endDate);
        if (endDateObj < startDate) continue;
      }
      const recStart = new Date(rec.date);
      const recDay = Math.min(recStart.getDate(), new Date(year, month, 0).getDate());
      // Se mês atual, só gera até o dia atual
      if (isCurrentMonth && recDay > dayLimit) continue;
      // Se endDate existe e é menor que o dia da ocorrência, ignora
      if (rec.endDate) {
        const endDateObj = new Date(rec.endDate);
        const occDate = new Date(year, month - 1, recDay);
        if (endDateObj < occDate) continue;
      }
      // Só inclui se a ocorrência está dentro do mês
      const occDate = new Date(year, month - 1, recDay);
      if (occDate >= startDate && occDate <= endDate) {
        result.push({ ...rec, date: occDate } as T);
      }
    } else {
      // Pontual: mantém
      result.push(rec);
    }
  }
  return result;
}
import { prisma } from './prisma';

/**
 * Calcula o período efetivo para busca de transações
 * Se for mês atual, o final é até hoje
 * Se for mês anterior, é o mês completo
 */
export function getEffectiveDateRange(year: number, month: number): { startDate: Date; endDate: Date } {
  const today = new Date();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const effectiveEnd = isCurrentMonth 
    ? new Date(year, month - 1, today.getDate(), 23, 59, 59, 999)
    : endDate;
  
  return { startDate, endDate: effectiveEnd };
}

/**
 * Filtra transações recorrentes: só inclui se dayOfMonth <= dia especificado
 * Se nenhum dia for especificado, usa o dia de hoje
 */
/**
 * Filtra transações recorrentes considerando:
 * - Se endDate é menor que o início do mês consultado, ignora
 * - Se mês é o atual, inclui só recorrentes cujo dia <= dia atual
 * - Se mês é anterior, inclui todos os dias do mês
 * - Para pontuais, sempre inclui
 */
export function filterRecurringByDay<T extends { type: string; date: Date; endDate?: Date|null }>(
  records: T[],
  year: number,
  month: number,
  today: Date
): T[] {
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const dayLimit = isCurrentMonth ? today.getDate() : 31;
  const monthStart = new Date(year, month - 1, 1);

  return records.filter((record) => {
    if (record.type === 'RECURRING') {
      // Se tem endDate e ela é menor que o início do mês, ignora
      if (record.endDate) {
        const endDateObj = new Date(record.endDate);
        if (endDateObj < monthStart) return false;
      }
      const recordDate = new Date(record.date);
      const recordDay = recordDate.getDate();
      // Se mês atual, só inclui recorrente até o dia atual
      if (isCurrentMonth) return recordDay <= dayLimit;
      // Se mês anterior, inclui todos
      return true;
    }
    return true; // PUNCTUAL sempre incluído
  });
}

/**
 * Busca transações pontuais (PUNCTUAL) no período especificado
 */
export async function fetchPunctualTransactions(
  email: string,
  startDate: Date,
  endDate: Date,
  type: 'income' | 'expense'
) {
  const model = type === 'income' ? prisma.income : prisma.expense;
  
  return await model.findMany({
    where: {
      user: { email },
      type: 'PUNCTUAL',
      transferId: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      amount: true,
      date: true,
      description: true,
      category: { select: { name: true } },
      type: true,
    },
  });
}

/**
 * Busca transações recorrentes (RECURRING) - sem restrição de data
 * A filtragem por dia é feita em memória depois
 */
export async function fetchRecurringTransactions(
  email: string,
  type: 'income' | 'expense'
) {
  const model = type === 'income' ? prisma.income : prisma.expense;
  
  return await model.findMany({
    where: {
      user: { email },
      type: 'RECURRING',
      transferId: null,
    },
    select: {
      id: true,
      amount: true,
      date: true,
      description: true,
      category: { select: { name: true } },
      type: true,
    },
  });
}

/**
 * Função auxiliar para verificar se é categoria de transferência
 */
export function isTransferCategory(item: any): boolean {
  const cat = item.category?.name || '';
  return cat.trim().toLowerCase() === 'transferência entre contas';
}

/**
 * Busca todas as transações (pontuais + recorrentes filtradas)
 * Retorna já filtradas e prontas para uso
 */
export async function fetchAllTransactions(
  email: string,
  year: number,
  month: number,
  type: 'income' | 'expense'
) {
  const { startDate, endDate } = getEffectiveDateRange(year, month);
  
  // Buscar pontuais (apenas no período)
  const punctual = await fetchPunctualTransactions(email, startDate, endDate, type);
  
  // Buscar recorrentes (sem restrição de data)
  const recurring = await fetchRecurringTransactions(email, type);
  
  // Combinar e filtrar
  const all = [...punctual, ...recurring];
  
  // Remover transferências
  const filtered = all.filter(t => !isTransferCategory(t));
  
  // Filtrar recorrentes conforme regra de mês atual/anterior e endDate
  const today = new Date();
  const final = filterRecurringByDay(filtered, year, month, today);
  return final;
}
