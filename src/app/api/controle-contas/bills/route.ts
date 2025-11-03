import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const userId = user.id;
  const bills = await db.bill.findMany({ where: { userId }, include: { group: true, shares: true }, orderBy: { dueDate: 'desc' } });
  return NextResponse.json(bills);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const userId = user.id;
  const body = await request.json();
  const { title, description, amount, dueDate, groupId } = body;
  if (!title || !amount || !dueDate || !groupId) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  const created = await db.bill.create({ data: { title, description, amount: Number(amount), dueDate: new Date(dueDate), groupId, userId } });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const userId = user.id;
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
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const userId = user.id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.bill.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
