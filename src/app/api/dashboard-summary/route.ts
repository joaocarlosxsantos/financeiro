import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || (session as any)?.user?.sub || null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));
  const walletId = searchParams.get('walletId') || undefined;

  // datas do mês
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  // Filtros
  const walletFilter = walletId ? { walletId } : {};
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
  prisma.tag.findMany(),
  ]);

  // Resumo
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  // Por categoria
  const expensesByCategory: Record<string, { amount: number; color: string }> = {};
  for (const e of expenses) {
    const cat = e.category?.name || 'Sem categoria';
    const color = e.category?.color || '#94a3b8';
    if (!expensesByCategory[cat]) expensesByCategory[cat] = { amount: 0, color };
    expensesByCategory[cat].amount += Number(e.amount);
  }
  const expensesByCategoryArr = Object.entries(expensesByCategory).map(([category, v]) => ({ category, amount: v.amount, color: v.color }));

  // Por tag
  const expensesByTag: Record<string, { amount: number; color: string }> = {};
  for (const e of expenses) {
    if (Array.isArray(e.tags) && e.tags.length > 0) {
      for (const tag of e.tags) {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        if (!expensesByTag[tagName]) expensesByTag[tagName] = { amount: 0, color: '#6366f1' };
        expensesByTag[tagName].amount += Number(e.amount);
      }
    }
  }
  const expensesByTagArr = Object.entries(expensesByTag).map(([tag, v]) => ({ tag, amount: v.amount, color: v.color }));

  // Por carteira
  const expensesByWallet: Record<string, number> = {};
  for (const e of expenses) {
    const wallet = e.wallet?.name || 'Sem carteira';
    if (!expensesByWallet[wallet]) expensesByWallet[wallet] = 0;
    expensesByWallet[wallet] += Number(e.amount);
  }
  const expensesByWalletArr = Object.entries(expensesByWallet).map(([wallet, amount]) => ({ wallet, amount }));

  // Por mês (últimos 12 meses)
  // (Opcional: pode ser implementado depois)

  return NextResponse.json({
    totalExpenses,
    totalIncome,
    expensesByCategory: expensesByCategoryArr,
    expensesByTag: expensesByTagArr,
    expensesByWallet: expensesByWalletArr,
    wallets,
    tags,
    // Adicione outros resumos conforme necessário
  });
}
