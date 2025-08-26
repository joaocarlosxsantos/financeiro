
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

  return NextResponse.json(wallets);
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
    type: z.enum(['CASH', 'BANK', 'CREDIT', 'OTHER'], { required_error: 'Tipo é obrigatório' }),
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
