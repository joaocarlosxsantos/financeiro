
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id },
    include: {
      expenses: true,
      incomes: true,
    },
  });

  // Expand FIXED records (expenses/incomes) up to today so balance reflects recurring items
  const today = new Date();

  function expandFixedRecords(records: any[], upto: Date) {
    const expanded: any[] = [];
    for (const r of records) {
      if (r.isFixed) {
        const recStart = r.startDate ? new Date(r.startDate) : r.date ? new Date(r.date) : new Date(1900, 0, 1);
        const recEnd = r.endDate ? new Date(r.endDate) : upto;
        const from = recStart;
        const to = recEnd < upto ? recEnd : upto;
        if (from.getTime() <= to.getTime()) {
          const day = typeof r.dayOfMonth === 'number' && r.dayOfMonth > 0 ? r.dayOfMonth : (r.date ? new Date(r.date).getDate() : 1);
          let cur = new Date(from.getFullYear(), from.getMonth(), 1);
          const last = new Date(to.getFullYear(), to.getMonth(), 1);
          while (cur.getTime() <= last.getTime()) {
            const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
            const dayInMonth = Math.min(day, lastDayOfMonth);
            const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
            if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
              expanded.push({ ...r, date: occDate.toISOString() });
            }
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          }
        }
      } else {
        if (r.date && new Date(r.date) <= upto) expanded.push(r);
      }
    }
    return expanded;
  }

  const walletsWithBalance = wallets.map((w) => {
    // expand incomes and expenses
    const incomesExpanded = expandFixedRecords(w.incomes || [], today);
    const expensesExpanded = expandFixedRecords(w.expenses || [], today);
    const totalIncomes = incomesExpanded.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const totalExpenses = expensesExpanded.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const balance = totalIncomes - totalExpenses;
    return { ...w, balance };
  });

  const headers = new Headers();
  headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  return NextResponse.json(walletsWithBalance, { headers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  const body = await req.json();
  const walletSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    type: z.enum(['CASH', 'BANK', 'OTHER', 'VALE_BENEFICIOS'], { required_error: 'Tipo é obrigatório' }),
  });
  const parse = walletSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const { name, type } = parse.data;
  const wallet = await prisma.wallet.create({
    data: { name, type, userId: user.id },
  });
  return NextResponse.json(wallet, { status: 201 });
}
