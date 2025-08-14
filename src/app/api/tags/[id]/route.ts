import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// /api/tags/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  }
  const tag = await prisma.tag.update({ where: { id }, data: { name } });
  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
