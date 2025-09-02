import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });

  const headers = new Headers();
  // categories rarely change; safe to cache for 60s (adjust as needed)
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return NextResponse.json(categories, { headers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email || undefined } });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const categorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    color: z.string().optional().default('#3B82F6'),
    type: z.enum(['EXPENSE', 'INCOME', 'BOTH']),
    icon: z.string().optional().nullable(),
  });
  const parse = categorySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues.map((e) => e.message).join(', ') },
      { status: 400 },
    );
  }
  const { name, color, type, icon } = parse.data;

  try {
    const category = await prisma.category.create({
      data: { name, color, type, icon, userId: user.id },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao criar categoria' }, { status: 500 });
  }
}
