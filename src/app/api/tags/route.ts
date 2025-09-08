
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  // Validate user exists to avoid returning tags for non-existing user id (defensive)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado. Faça login novamente.' }, { status: 401 });

  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return NextResponse.json(tags, { headers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json();
  const tagSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
  });
  const parse = tagSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const { name } = parse.data;
  // Ensure the user still exists (prevents FK violations if user was removed)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado. Faça login novamente.' }, { status: 401 });

  try {
    const tag = await prisma.tag.create({ data: { name, userId } });
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
