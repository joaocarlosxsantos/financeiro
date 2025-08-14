import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  const transfers = await prisma.transfer.findMany({
    where: { userId: user.id },
    include: { fromWallet: true, toWallet: true },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(transfers);
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
  const { fromWalletId, toWalletId, amount, date } = await req.json();
  if (!fromWalletId || !toWalletId || !amount) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }
  if (fromWalletId === toWalletId) {
    return NextResponse.json({ error: 'Carteiras de origem e destino devem ser diferentes' }, { status: 400 });
  }
  const transfer = await prisma.transfer.create({
    data: {
      fromWalletId,
      toWalletId,
      amount,
      date: date ? new Date(date) : new Date(),
      userId: user.id,
    },
  });
  return NextResponse.json(transfer, { status: 201 });
}
