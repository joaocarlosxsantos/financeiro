import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Member } from '@/types/controle-contas';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const where: any = { userId };
  if (groupId) where.groupId = Number(groupId);
  const members = await db.member.findMany({ where, include: { group: true }, orderBy: { createdAt: 'desc' } });
  type PrismaMember = Awaited<ReturnType<typeof prisma.member.findMany>>[number];
  const payload: Member[] = members.map((m: PrismaMember) => ({ id: m.id, name: m.name, phone: m.phone, groupId: m.group?.id ?? null }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { name, phone, groupId } = body;
  if (!name || !groupId) return NextResponse.json({ error: 'name and groupId required' }, { status: 400 });
  const created = await db.member.create({ data: { name, phone, groupId, userId } });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, name, phone, groupId } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.member.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await db.member.update({ where: { id: Number(id) }, data: { name, phone, groupId } });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.member.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.member.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
