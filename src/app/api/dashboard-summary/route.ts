// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { prisma } from '@/lib/prisma';
// @ts-ignore
import { getServerSession } from 'next-auth';
// @ts-ignore
import { authOptions } from '@/lib/auth';
// @ts-ignore
import { Session } from 'next-auth';
// @ts-ignore
import { getMonthRangeBrasilia, createBrasiliaDate, parseInputDateBrasilia } from '@/lib/datetime-brasilia';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let userId: string | null = null;
  if (session && session.user) {
    userId = (session.user as Session['user'] & { id?: string }).id || null;
  }
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));
  const walletId = searchParams.get('walletId') || undefined;

  // datas do mês usando timezone do Brasil
  const { start, end } = getMonthRangeBrasilia(year, month);
  const { formatYmd } = await import('@/lib/utils');
  
  // Converte para ISO string para o Prisma
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  // Filtros
  const walletFilter = walletId
    ? walletId.includes(',')
      ? { walletId: { in: walletId.split(',').map((s) => s.trim()).filter(Boolean) } }
      : { walletId }
    : {};
  const userFilter = { userId };
  const dateFilter = { gte: startStr, lte: endStr };

  // Busca paralela
  const [pontuaisExpenses, pontuaisIncomes, recorrentesExpenses, recorrentesIncomes, wallets, tags] = await Promise.all([
    // Despesas pontuais do mês
    prisma.expense.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: false,
        date: dateFilter 
      },
      include: { category: true, wallet: true },
    }),
    // Rendas pontuais do mês
    prisma.income.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: false,
        date: dateFilter 
      },
      include: { category: true, wallet: true },
    }),
    // Despesas recorrentes (todas, vamos expandir depois)
    prisma.expense.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: true
      },
      include: { category: true, wallet: true },
    }),
    // Rendas recorrentes (todas, vamos expandir depois)
    prisma.income.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: true
      },
      include: { category: true, wallet: true },
    }),
    prisma.wallet.findMany({ where: { ...userFilter } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  type PrismaExpense = Awaited<ReturnType<typeof prisma.expense.findMany>>[number];
  type PrismaIncome = Awaited<ReturnType<typeof prisma.income.findMany>>[number];

  // Função para expandir apenas recorrentes que ocorrem no mês especificado
  function expandRecurrentesForMonth(records: (PrismaExpense | PrismaIncome)[], targetYear: number, targetMonth: number) {
    const expanded: (PrismaExpense | PrismaIncome)[] = [];
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === targetYear && today.getMonth() + 1 === targetMonth;
    const dayLimit = isCurrentMonth ? today.getDate() : 31;
    
    for (const r of records) {
      // Verifica se a recorrente está ativa neste mês
      const monthStart = createBrasiliaDate(targetYear, targetMonth, 1);
      const monthEnd = createBrasiliaDate(targetYear, targetMonth + 1, 0);
      
      // Se tem endDate e já terminou antes deste mês, pula
      if (r.endDate) {
        const recEndDate = parseInputDateBrasilia(r.endDate);
        if (recEndDate < monthStart) continue;
      }
      
      // Se tem startDate e ainda não começou, pula
      if (r.startDate) {
        const recStartDate = parseInputDateBrasilia(r.startDate);
        if (recStartDate > monthEnd) continue;
      }
      
      // Determina o dia da ocorrência
      const day = typeof r.dayOfMonth === 'number' && r.dayOfMonth > 0 
        ? r.dayOfMonth 
        : (r.date ? parseInputDateBrasilia(r.date).getDate() : 1);
      
      // Ajusta para o último dia do mês se necessário
      const lastDayOfMonth = monthEnd.getDate();
      const dayInMonth = Math.min(day, lastDayOfMonth);
      
      // Se for mês atual e o dia ainda não chegou, pula
      if (isCurrentMonth && dayInMonth > dayLimit) {
        continue;
      }
      
      // Cria a ocorrência para este mês
      const occDate = createBrasiliaDate(targetYear, targetMonth, dayInMonth);
      expanded.push({ ...(r as any), date: formatYmd(occDate) } as PrismaExpense | PrismaIncome);
    }
    
    return expanded;
  }

  // Expande recorrentes apenas para o mês selecionado
  const recorrentesExpensesExpanded = expandRecurrentesForMonth(recorrentesExpenses, year, month);
  const recorrentesIncomesExpanded = expandRecurrentesForMonth(recorrentesIncomes, year, month);

  // Combina pontuais + recorrentes do mês
  const expensesThisMonth = [...pontuaisExpenses, ...recorrentesExpensesExpanded];
  const incomesThisMonth = [...pontuaisIncomes, ...recorrentesIncomesExpanded];

  // Resumo do mês atual
  const totalExpenses = expensesThisMonth.reduce((sum: number, e: PrismaExpense) => sum + Number(e.amount), 0);
  const totalIncome = incomesThisMonth.reduce((sum: number, i: PrismaIncome) => sum + Number(i.amount), 0);

  // Saldo do mês
  const saldoDoMes = totalIncome - totalExpenses;

  // Saldo acumulado (soma de TODOS os períodos até a data final)
  // Busca todas as transações até a data final
  const [allPontuaisExpenses, allPontuaisIncomes, allRecorrentesExpenses, allRecorrentesIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: false,
        date: { lte: endStr }
      },
    }),
    prisma.income.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: false,
        date: { lte: endStr }
      },
    }),
    prisma.expense.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: true
      },
    }),
    prisma.income.findMany({
      where: { 
        ...userFilter, 
        ...walletFilter,
        isRecurring: true
      },
    }),
  ]);

  // Função para expandir recorrentes até o mês/ano especificado
  function expandRecurrentesUntil(records: (PrismaExpense | PrismaIncome)[], untilYear: number, untilMonth: number) {
    const expanded: (PrismaExpense | PrismaIncome)[] = [];
    const today = new Date();
    
    for (const r of records) {
      const recStart = r.startDate ? parseInputDateBrasilia(r.startDate) : (r.date ? parseInputDateBrasilia(r.date) : createBrasiliaDate(1900, 1, 1));
      const recEnd = r.endDate ? parseInputDateBrasilia(r.endDate) : createBrasiliaDate(untilYear, untilMonth + 1, 0);
      
      const startYear = recStart.getFullYear();
      const startMonth = recStart.getMonth() + 1;
      
      // Itera por cada mês desde o início até o mês final
      let curYear = startYear;
      let curMonth = startMonth;
      
      while (curYear < untilYear || (curYear === untilYear && curMonth <= untilMonth)) {
        const monthStart = createBrasiliaDate(curYear, curMonth, 1);
        const monthEnd = createBrasiliaDate(curYear, curMonth + 1, 0);
        
        // Verifica se esta ocorrência está dentro do período da recorrente
        if (monthEnd < recStart || (r.endDate && monthStart > recEnd)) {
          // Avança para o próximo mês
          curMonth++;
          if (curMonth > 12) {
            curMonth = 1;
            curYear++;
          }
          continue;
        }
        
        // Determina o dia da ocorrência
        const day = typeof r.dayOfMonth === 'number' && r.dayOfMonth > 0 
          ? r.dayOfMonth 
          : recStart.getDate();
        
        const lastDayOfMonth = monthEnd.getDate();
        const dayInMonth = Math.min(day, lastDayOfMonth);
        
        const isCurrentMonth = today.getFullYear() === curYear && today.getMonth() + 1 === curMonth;
        const dayLimit = isCurrentMonth ? today.getDate() : 31;
        
        // Se for mês atual e o dia ainda não chegou, pula
        if (isCurrentMonth && dayInMonth > dayLimit) {
          curMonth++;
          if (curMonth > 12) {
            curMonth = 1;
            curYear++;
          }
          continue;
        }
        
        // Cria a ocorrência
        const occDate = createBrasiliaDate(curYear, curMonth, dayInMonth);
        expanded.push({ ...(r as any), date: formatYmd(occDate) } as PrismaExpense | PrismaIncome);
        
        // Avança para o próximo mês
        curMonth++;
        if (curMonth > 12) {
          curMonth = 1;
          curYear++;
        }
      }
    }
    
    return expanded;
  }

  const allRecorrentesExpensesExpanded = expandRecurrentesUntil(allRecorrentesExpenses, year, month);
  const allRecorrentesIncomesExpanded = expandRecurrentesUntil(allRecorrentesIncomes, year, month);

  const totalExpensesAcumulado = [...allPontuaisExpenses, ...allRecorrentesExpensesExpanded].reduce((sum: number, e: PrismaExpense) => sum + Number(e.amount), 0);
  const totalIncomeAcumulado = [...allPontuaisIncomes, ...allRecorrentesIncomesExpanded].reduce((sum: number, i: PrismaIncome) => sum + Number(i.amount), 0);
  const saldoAcumulado = totalIncomeAcumulado - totalExpensesAcumulado;

  // Limite diário (quanto pode gastar por dia até o fim do mês para não ficar negativo)
  const today = new Date();
  const lastDay = new Date(year, month, 0);
  const diasRestantes = Math.max(
    1,
    Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const limiteDiario = saldoAcumulado > 0 ? saldoAcumulado / diasRestantes : 0;

  // Por categoria
  const expensesByCategory: Record<string, { amount: number; color: string }> = {};
  for (const e of expensesThisMonth) {
    const cat = e.category?.name || 'Sem categoria';
    // Excluir categoria de transferência dos gráficos
    if (cat === 'Transferência entre Contas') continue;
    const color = e.category?.color || 'hsl(var(--muted-foreground))';
    if (!expensesByCategory[cat]) expensesByCategory[cat] = { amount: 0, color };
    expensesByCategory[cat].amount += Number(e.amount);
  }
  const expensesByCategoryArr = Object.entries(expensesByCategory).map(
    ([category, v]: [string, { amount: number; color: string }]) => ({ category, amount: v.amount, color: v.color }),
  );

  // Por tag
  const expensesByTag: Record<string, { amount: number; color: string }> = {};
  for (const e of expensesThisMonth) {
    if (Array.isArray(e.tags) && e.tags.length > 0) {
        for (const tag of e.tags) {
        const tagName = tag;
        if (!expensesByTag[tagName]) expensesByTag[tagName] = { amount: 0, color: 'hsl(var(--primary))' };
        expensesByTag[tagName].amount += Number(e.amount);
      }
    }
  }
  const expensesByTagArr = Object.entries(expensesByTag).map(([tag, v]: [string, { amount: number; color: string }]) => ({
    tag,
    amount: v.amount,
    color: v.color,
  }));

  // Por carteira
  const expensesByWallet: Record<string, number> = {};
  for (const e of expensesThisMonth) {
    const wallet = e.wallet?.name || 'Sem carteira';
    if (!expensesByWallet[wallet]) expensesByWallet[wallet] = 0;
    expensesByWallet[wallet] += Number(e.amount);
  }
  const expensesByWalletArr = Object.entries(expensesByWallet).map(
    ([wallet, amount]: [string, number]) => ({ wallet, amount }),
  );

  return NextResponse.json({
    totalExpenses,
    totalIncome,
    saldoDoMes,
    saldoAcumulado,
    limiteDiario,
    expensesByCategory: expensesByCategoryArr,
    expensesByTag: expensesByTagArr,
    expensesByWallet: expensesByWalletArr,
    wallets,
    tags,
    // Adicione outros resumos conforme necessário
  });
}
