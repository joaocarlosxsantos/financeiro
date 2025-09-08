import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { theme: true } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  return NextResponse.json({ theme: user.theme || 'system' });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { theme } = await req.json();
  if (!['light','dark','system'].includes(theme)) {
    return NextResponse.json({ error: 'Tema inválido' }, { status: 400 });
  }
  const updated = await prisma.user.updateMany({ where: { email: session.user.email }, data: { theme } });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
