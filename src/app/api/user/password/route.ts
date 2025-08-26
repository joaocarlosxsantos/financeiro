import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Senha inválida' }, { status: 400 });
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email: session.user.email },
    data: { password: hashedPassword },
  });
  return NextResponse.json({ message: 'Senha alterada com sucesso' });
}
