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
