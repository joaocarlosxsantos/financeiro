import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  const body = await req.json();
  const passwordSchema = z.object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  });
  
  const parse = passwordSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  
  const { password } = parse.data;
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email: session.user.email },
    data: { password: hashedPassword },
  });
  return NextResponse.json({ message: 'Senha alterada com sucesso' });
}
