import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: retorna dados do usuário logado
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  return NextResponse.json(user);
}

// PUT: atualiza dados do usuário logado
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { name, email, phone } = await req.json();
  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: { name, email, phone },
  });
  return NextResponse.json({
    message: 'Usuário atualizado',
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
}
