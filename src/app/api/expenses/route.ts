import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseFlexibleDate(input?: string | null): Date | undefined {
  if (!input) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number)
    return new Date(y, m - 1, d)
  }
  const dt = new Date(input)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const type = url.searchParams.get('type') // FIXED | VARIABLE

  const where: any = { userId: user.id }
  if (type) where.type = type as any
  const startD = start ? parseFlexibleDate(start) : undefined
  const endD = end ? parseFlexibleDate(end) : undefined
  if ((!type || type === 'VARIABLE') && startD && endD) {
    where.date = { gte: startD, lte: endD }
  }
  // Filtrar FIXED ativos no período, se período informado
  if (type === 'FIXED' && startD && endD) {
    where.AND = [
      {
        OR: [
          { startDate: null },
          { startDate: { lte: endD } },
        ],
      },
      {
        OR: [
          { endDate: null },
          { endDate: { gte: startD } },
        ],
      },
    ]
  }
  // Adicionar filtro por carteira, se informado
  const walletId = url.searchParams.get('walletId');
  if (walletId) where.walletId = walletId;

  const expenses = await prisma.expense.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: { category: true, wallet: true } })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, amount, date, type, isFixed = false, startDate, endDate, dayOfMonth, categoryId, walletId } = body
  if (!description || !amount) return NextResponse.json({ error: 'Descrição e valor são obrigatórios' }, { status: 400 })

  const expense = await prisma.expense.create({
    data: {
      description,
      amount,
      date: date ? parseFlexibleDate(date) ?? new Date() : new Date(),
      type,
      isFixed,
      startDate: parseFlexibleDate(startDate),
      endDate: parseFlexibleDate(endDate),
      dayOfMonth,
      categoryId,
      walletId,
      userId: user.id,
    },
  })
  return NextResponse.json(expense, { status: 201 })
}


