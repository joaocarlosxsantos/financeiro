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
  const url = new URL(request.url);
  const groupIdParam = url.searchParams.get('groupId');
  const where: any = { userId };
  if (groupIdParam) where.groupId = Number(groupIdParam);
  const bills = await db.bill.findMany({ where, include: { group: true, shares: true }, orderBy: { dueDate: 'desc' } });
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
  shares: b.shares?.map((s: any) => ({ memberId: s.memberId, type: s.percent != null ? 'percent' : 'value', amount: s.percent != null ? s.percent : s.amount })) ?? undefined,
  }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { title, description, amount, dueDate, groupId, shares } = body;
  console.debug('[API] POST /api/controle-contas/contas body:', JSON.stringify(body));
  if (!title || !amount || !dueDate || !groupId) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  // prepare shares create data if provided
  const sharesCreate = Array.isArray(shares)
    ? shares.map((s: any) => ({ memberId: Number(s.memberId), userId, amount: s.type === 'value' ? Number(s.amount) : 0, percent: s.type === 'percent' ? Number(s.amount) : null }))
    : undefined;
  const created = await db.bill.create({ data: { title, description, amount: Number(amount), dueDate: new Date(dueDate), groupId, userId, ...(sharesCreate ? { shares: { create: sharesCreate } } : {}) }, include: { group: true, shares: true } });
  const payload = {
    id: created.id,
    name: created.title ?? created.name ?? `Conta ${created.id}`,
    title: created.title ?? undefined,
    description: created.description ?? undefined,
    value: Number(created.amount),
    amount: created.amount,
    createdAt: created.createdAt?.toISOString?.() ?? undefined,
    dueDate: created.dueDate ? created.dueDate.toISOString() : null,
    group: { id: created.group.id, name: created.group.name },
    shares: created.shares?.map((s: any) => ({ memberId: s.memberId, type: s.type, amount: s.amount })) ?? undefined,
  };
  return NextResponse.json(payload, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await request.json();
  const { id, title, description, amount, dueDate, groupId, paid, shares } = body;
  console.debug('[API] PUT /api/controle-contas/contas body:', JSON.stringify(body));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // update main bill
  const updated = await db.bill.update({ where: { id: Number(id) }, data: { title, description, amount: amount ? Number(amount) : undefined, dueDate: dueDate ? new Date(dueDate) : undefined, groupId, paid }, include: { group: true, shares: true } });
  // if shares provided, replace them
  if (Array.isArray(shares)) {
    await db.billMemberShare.deleteMany({ where: { billId: updated.id } });
    const createData = shares.map((s: any) => ({ billId: updated.id, memberId: Number(s.memberId), userId, amount: s.type === 'value' ? Number(s.amount) : 0, percent: s.type === 'percent' ? Number(s.amount) : null }));
    if (createData.length > 0) await db.billMemberShare.createMany({ data: createData });
    // reload with shares
    const reloaded = await db.bill.findUnique({ where: { id: updated.id }, include: { group: true, shares: true } });
    if (reloaded) {
      const payload = {
        id: reloaded.id,
        name: reloaded.title ?? reloaded.name ?? `Conta ${reloaded.id}`,
        title: reloaded.title ?? undefined,
        description: reloaded.description ?? undefined,
        value: Number(reloaded.amount),
        amount: reloaded.amount,
        createdAt: reloaded.createdAt?.toISOString?.() ?? undefined,
        dueDate: reloaded.dueDate ? reloaded.dueDate.toISOString() : null,
        group: { id: reloaded.group.id, name: reloaded.group.name },
        shares: reloaded.shares?.map((s: any) => ({ memberId: s.memberId, type: s.percent != null ? 'percent' : 'value', amount: s.percent != null ? s.percent : s.amount })) ?? undefined,
      };
      return NextResponse.json(payload);
    }
  }
  const payload = {
    id: updated.id,
    name: updated.title ?? updated.name ?? `Conta ${updated.id}`,
    title: updated.title ?? undefined,
    description: updated.description ?? undefined,
    value: Number(updated.amount),
    amount: updated.amount,
    createdAt: updated.createdAt?.toISOString?.() ?? undefined,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    group: { id: updated.group.id, name: updated.group.name },
    shares: updated.shares?.map((s: any) => ({ memberId: s.memberId, type: s.type, amount: s.amount })) ?? undefined,
  };
  return NextResponse.json(payload);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? url.searchParams.get('billId');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.bill.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
