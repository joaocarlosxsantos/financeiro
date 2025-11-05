/**
 * Wallets API Endpoint
 * 
 * @route GET /api/wallets
 * @route POST /api/wallets
 * 
 * @description Gerencia carteiras do usuário
 * 
 * GET: Retorna lista de carteiras com saldos
 * POST: Cria nova carteira
 * 
 * ===== GET /api/wallets =====
 * 
 * @param {Object} query - Query parameters
 * @param {string} [query.includeBalance] - Se true, calcula saldo em tempo real
 * @param {string} [query.sort] - Campo para ordenação (name, createdAt)
 * @param {string} [query.order] - Ordem: asc (padrão) ou desc
 * 
 * @returns {Array} Array de carteiras
 * @returns {string} id - ID único da carteira
 * @returns {string} name - Nome da carteira
 * @returns {string} type - Tipo: cash, bank_account, credit_card, debit_card
 * @returns {number} balance - Saldo (se includeBalance=true)
 * 
 * @example
 * // Listar todas as carteiras
 * GET /api/wallets
 * 
 * @example
 * // Com saldos calculados
 * GET /api/wallets?includeBalance=true
 * 
 * ===== POST /api/wallets =====
 * 
 * @param {Object} body - Dados da carteira
 * @param {string} body.name - Nome da carteira
 * @param {string} body.type - Tipo: cash, bank_account, credit_card, debit_card
 * @param {number} [body.initialBalance] - Saldo inicial (padrão: 0)
 * 
 * @returns {Object} Carteira criada
 * @returns {string} id - ID único
 * 
 * @throws {401} Não autenticado
 * @throws {400} Validação falhou
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
type WalletRecord = Awaited<ReturnType<typeof prisma.wallet.findMany>>[number];
type ExpenseRecord = WalletRecord extends { expenses?: (infer E)[] } ? E : any;
type IncomeRecord = WalletRecord extends { incomes?: (infer I)[] } ? I : any;
import { z } from 'zod';export async function GET(req: NextRequest) {
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
      expenses: {
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          type: true,
          paymentType: true,
          isRecurring: true,
          startDate: true,
          endDate: true,
          dayOfMonth: true,
          transferId: true,
          categoryId: true,
          walletId: true,
          userId: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      incomes: {
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          isRecurring: true,
          startDate: true,
          endDate: true,
          dayOfMonth: true,
          transferId: true,
          categoryId: true,
          walletId: true,
          userId: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // Expand FIXED records (expenses/incomes) up to today so balance reflects recurring items
  const today = new Date();

  function expandFixedRecords(records: (ExpenseRecord | IncomeRecord)[], upto: Date) {
    console.log('📊 expandFixedRecords - Input:', records.length, 'registros');
    console.log('Recorrentes:', records.filter((r: any) => r.isRecurring).length);
    
    const expanded: (ExpenseRecord | IncomeRecord)[] = [];
    for (const r of records) {
      if (r.isRecurring) {
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
            // Só inclui se a data da ocorrência estiver no intervalo E não for futura
            if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime() && occDate.getTime() <= upto.getTime()) {
              expanded.push({ ...(r as any), date: occDate.toISOString() } as ExpenseRecord | IncomeRecord);
            }
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          }
        }
      } else {
        // Para registros não recorrentes, inclui apenas se a data existir e for até hoje
        if (r.date && new Date(r.date).getTime() <= upto.getTime()) {
          expanded.push(r);
        }
      }
    }
    
    console.log('📊 expandFixedRecords - Output:', expanded.length, 'registros');
    
    return expanded;
  }

  const walletsWithBalance = wallets.map((w: WalletRecord & { expenses?: ExpenseRecord[]; incomes?: IncomeRecord[] }) => {
    console.log(`\n🔍 Carteira: ${w.name}`);
    console.log('Total incomes:', w.incomes?.length);
    console.log('Incomes recorrentes:', w.incomes?.filter((i: any) => i.isRecurring).length);
    if (w.incomes?.filter((i: any) => i.isRecurring).length > 0) {
      console.log('Detalhes dos recorrentes:', w.incomes?.filter((i: any) => i.isRecurring).map((i: any) => ({
        id: i.id,
        description: i.description,
        amount: i.amount,
        isRecurring: i.isRecurring,
        startDate: i.startDate,
        endDate: i.endDate,
        dayOfMonth: i.dayOfMonth
      })));
    }
    
    // expand incomes and expenses
  const incomesExpanded = expandFixedRecords(w.incomes || [], today);
  const expensesExpanded = expandFixedRecords(w.expenses || [], today);
  const totalIncomes = incomesExpanded.reduce((s: number, i: ExpenseRecord | IncomeRecord) => s + Number((i as any).amount), 0);
  const totalExpenses = expensesExpanded.reduce((s: number, e: ExpenseRecord | IncomeRecord) => s + Number((e as any).amount), 0);
    const balance = totalIncomes - totalExpenses;
    
    console.log('Após expansão:', incomesExpanded.length, 'incomes');
    console.log('Saldo calculado:', balance);
    
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
