import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// /api/tags/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  
  const { id } = params;
  
  const body = await req.json();
  const tagUpdateSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
  });
  
  const parse = tagUpdateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  
  const { name } = parse.data;
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tag = await prisma.tag.update({ where: { id }, data: { name } });
  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  
  const { id } = params;
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
