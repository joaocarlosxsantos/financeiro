import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { BillWithGroup } from '@/types/controle-contas';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const bills = await db.bill.findMany({ where: { userId }, include: { group: true, shares: true }, orderBy: { dueDate: 'desc' } });
  type PrismaBill = Awaited<ReturnType<typeof prisma.bill.findMany>>[number];
  const payload: BillWithGroup[] = bills.map((b: PrismaBill) => ({
    id: b.id,
    name: b.title ?? b.name ?? `Conta ${b.id}`,
    title: b.title ?? undefined,
    description: b.description ?? undefined,
    value: Number(b.amount),
    amount: b.amount,
    createdAt: b.createdAt?.toISOString?.() ?? undefined,
    dueDate: b.dueDate ? b.dueDate.toISOString() : null,
    group: { id: b.group.id, name: b.group.name },
  shares: b.shares?.map((s: Awaited<ReturnType<typeof prisma.share.findMany>>[number]) => ({ memberId: s.memberId, type: s.type, amount: s.amount })) ?? undefined,
  }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { title, description, amount, dueDate, groupId } = body;
  if (!title || !amount || !dueDate || !groupId) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  const created = await db.bill.create({ data: { title, description, amount: Number(amount), dueDate: new Date(dueDate), groupId, userId } });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, title, description, amount, dueDate, groupId, paid } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await db.bill.update({ where: { id: Number(id) }, data: { title, description, amount: amount ? Number(amount) : undefined, dueDate: dueDate ? new Date(dueDate) : undefined, groupId, paid } });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.bill.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
