import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Session } from 'next-auth';
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
  const startStr = formatYmd(start);
  const endStr = formatYmd(end);

  // Filtros
  const walletFilter = walletId
    ? walletId.includes(',')
      ? { walletId: { in: walletId.split(',').map((s) => s.trim()).filter(Boolean) } }
      : { walletId }
    : {};
  const userFilter = { userId };
  const dateFilter = { gte: startStr, lte: endStr };

  // Busca paralela
  const [expenses, incomes, wallets, tags] = await Promise.all([
    prisma.expense.findMany({
      where: { ...userFilter, ...walletFilter, date: dateFilter },
      include: { category: true, wallet: true },
    }),
    prisma.income.findMany({
      where: { ...userFilter, ...walletFilter, date: dateFilter },
      include: { category: true, wallet: true },
    }),
    prisma.wallet.findMany({ where: { ...userFilter } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  // Resumo do mês atual
  type PrismaExpense = Awaited<ReturnType<typeof prisma.expense.findMany>>[number];
  type PrismaIncome = Awaited<ReturnType<typeof prisma.income.findMany>>[number];
  const totalExpenses = expenses.reduce((sum: number, e: PrismaExpense) => sum + Number(e.amount), 0);
  const totalIncome = incomes.reduce((sum: number, i: PrismaIncome) => sum + Number(i.amount), 0);

  // Saldo do mês
  const saldoDoMes = totalIncome - totalExpenses;

  // Saldo acumulado (todas as receitas e despesas até o fim do mês selecionado)
  const acumuladoExpenses = await prisma.expense.findMany({
    where: {
      userId,
      ...(walletId ? { walletId } : {}),
      date: { lte: endStr },
    },
  });
  const acumuladoIncomes = await prisma.income.findMany({
    where: {
      userId,
      ...(walletId ? { walletId } : {}),
      date: { lte: endStr },
    },
  });
  // Expandir despesas/rendas FIXED em ocorrências mensais até endStr
  const endDate = parseInputDateBrasilia(endStr);

  function expandFixedRecords(records: (PrismaExpense | PrismaIncome)[], upto: Date) {
    const expanded: (PrismaExpense | PrismaIncome)[] = [];
    for (const r of records) {
      // Se for RECURRING, NÃO incluir o registro original (evita duplicação) — gerar apenas ocorrências mensais
      if (r.isRecurring) {
        const recStart = r.startDate ? parseInputDateBrasilia(r.startDate) : r.date ? parseInputDateBrasilia(r.date) : createBrasiliaDate(1900, 1, 1);
        const recEnd = r.endDate ? parseInputDateBrasilia(r.endDate) : upto;
        const minDate = createBrasiliaDate(1900, 1, 1);
        const from = recStart > minDate ? recStart : minDate;
        const to = recEnd < upto ? recEnd : upto;
        if (from && to && from.getTime() <= to.getTime()) {
          const day = typeof r.dayOfMonth === 'number' && r.dayOfMonth > 0 ? r.dayOfMonth : (r.date ? parseInputDateBrasilia(r.date).getDate() : 1);
          let cur = createBrasiliaDate(from.getFullYear(), from.getMonth() + 1, 1);
          const last = createBrasiliaDate(to.getFullYear(), to.getMonth() + 1, 1);
          while (cur.getTime() <= last.getTime()) {
            const lastDayOfMonth = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 2, 0).getDate();
            const dayInMonth = Math.min(day, lastDayOfMonth);
            const occDate = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 1, dayInMonth);
            if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
              expanded.push({ ...(r as any), date: formatYmd(occDate) } as PrismaExpense | PrismaIncome);
            }
            cur = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 2, 1);
          }
        }
      } else {
  // não-FIXED: incluir o registro original se estiver até 'upto'
  if (r.date && new Date(r.date) <= upto) expanded.push(r);
      }
    }
    return expanded;
  }

  const allExpensesExpanded = expandFixedRecords(acumuladoExpenses, endDate);
  const allIncomesExpanded = expandFixedRecords(acumuladoIncomes, endDate);

  const totalExpensesAcumulado = allExpensesExpanded.reduce((sum: number, e: PrismaExpense) => sum + Number(e.amount), 0);
  const totalIncomeAcumulado = allIncomesExpanded.reduce((sum: number, i: PrismaIncome) => sum + Number(i.amount), 0);
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
  for (const e of expenses) {
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
  for (const e of expenses) {
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
  for (const e of expenses) {
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
