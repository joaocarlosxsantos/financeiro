
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado. Faça login novamente.' }, { status: 401 });

  const tags = await prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } });
  // Return without caching headers to ensure clients always get fresh data
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado. Faça login novamente.' }, { status: 401 });
  
  const body = await req.json();
  const tagSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
  });
  const parse = tagSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const { name } = parse.data;

  try {
    const tag = await prisma.tag.create({ data: { name, userId: user.id } });
    return NextResponse.json(tag);
  } catch (err: any) {
    // Surface a nicer message for FK or unique constraint issues
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Falha ao criar tag: usuário não existe.' }, { status: 400 });
    }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma tag com esse nome para este usuário.' }, { status: 400 });
    }
    throw err;
  }
}
