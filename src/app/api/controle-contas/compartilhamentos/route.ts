import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const shares = await db.billMemberShare.findMany({ where: { userId }, include: { bill: true, member: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(shares);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { billId, memberId, amount, percent } = body;
  if (!billId || !memberId || !amount) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  const bill = await db.bill.findUnique({ where: { id: Number(billId) } });
  if (!bill || bill.userId !== userId) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  const member = await db.member.findUnique({ where: { id: Number(memberId) } });
  if (!member || member.userId !== userId) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  const created = await db.billMemberShare.create({ data: { billId, memberId, amount: Number(amount), percent: percent ? Number(percent) : undefined, userId } });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, amount, percent } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.billMemberShare.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await db.billMemberShare.update({ where: { id: Number(id) }, data: { amount: amount ? Number(amount) : undefined, percent: percent ? Number(percent) : undefined } });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.billMemberShare.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.billMemberShare.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
