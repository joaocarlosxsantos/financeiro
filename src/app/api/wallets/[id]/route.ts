import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  const wallet = await prisma.wallet.findFirst({ where: { id: params.id, userId: user.id } });
  if (!wallet) {
    return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
  }
  return NextResponse.json(wallet);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
  const wallet = await prisma.wallet.update({
    where: { id: params.id, userId: user.id },
    data: { name, type },
  });
  return NextResponse.json(wallet);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  await prisma.wallet.delete({ where: { id: params.id, userId: user.id } });
  return NextResponse.json({ success: true });
}
