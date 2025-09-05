import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const groups = await db.group.findMany({ where: { userId }, include: { _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } });
  // map to a simple shape
  const payload = (groups as any[]).map((g: any) => ({ id: g.id, name: g.name, description: g.description, membersCount: (g as any)._count?.members ?? 0 }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { name, description } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const created = await db.group.create({ data: { name, description, userId } });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, name, description } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.group.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await db.group.update({ where: { id: Number(id) }, data: { name, description } });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.group.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.group.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
