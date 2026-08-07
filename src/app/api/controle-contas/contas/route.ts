import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { BillWithGroup } from '@/types/controle-contas';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentBillCycle, toggleBillPaidMonth, getInstallmentDueDates } from '@/lib/bill-recurrence';
import crypto from 'crypto';

const db = prisma;

// NOTE: o client Prisma gerado localmente ainda não conhece os campos novos
// (scope/recurrence/endDate/excludedDates/paidMonths) até que `prisma generate`
// seja rodado após a migração — por isso os pontos que tocam esses campos
// usam `as any` deliberadamente, igual ao padrão já usado no restante deste
// arquivo para outras leituras de include.
function serializeBill(b: any): BillWithGroup {
  return {
    id: b.id,
    name: b.title ?? b.name ?? `Conta ${b.id}`,
    title: b.title ?? undefined,
    description: b.description ?? undefined,
    value: Number(b.amount),
    amount: b.amount,
    createdAt: b.createdAt?.toISOString?.() ?? undefined,
    dueDate: b.dueDate ? new Date(b.dueDate).toISOString() : null,
    paid: !!b.paid,
    scope: b.scope ?? 'SHARED',
    recurrence: b.recurrence ?? 'PUNCTUAL',
    endDate: b.endDate ? new Date(b.endDate).toISOString() : null,
    excludedDates: Array.isArray(b.excludedDates) ? b.excludedDates : [],
    paidMonths: Array.isArray(b.paidMonths) ? b.paidMonths : [],
    installmentGroupId: b.installmentGroupId ?? null,
    installmentNumber: b.installmentNumber ?? null,
    installmentCount: b.installmentCount ?? null,
    currentCycle: getCurrentBillCycle({
      recurrence: b.recurrence ?? 'PUNCTUAL',
      dueDate: b.dueDate,
      endDate: b.endDate,
      excludedDates: b.excludedDates,
      paid: b.paid,
      paidMonths: b.paidMonths,
    }),
    group: b.group ? { id: b.group.id, name: b.group.name } : null,
    shares: b.shares?.map((s: any) => ({ memberId: s.memberId, type: s.percent != null ? 'percent' : 'value', amount: s.percent != null ? s.percent : s.amount })) ?? undefined,
  };
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({ where: { email: session.user.email } });
  return user;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const groupIdParam = url.searchParams.get('groupId');
  const scopeParam = url.searchParams.get('scope'); // 'individual' | 'shared'
  const where: any = { userId: user.id };
  if (groupIdParam) where.groupId = Number(groupIdParam);
  if (scopeParam === 'individual') where.scope = 'INDIVIDUAL';
  if (scopeParam === 'shared') where.scope = 'SHARED';

  const bills = await db.bill.findMany({ where, include: { group: true, shares: true }, orderBy: { dueDate: 'desc' } });
  const payload = bills.map(serializeBill);
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    title, description, amount, dueDate,
    groupId, shares,
    scope: scopeInput, recurrence: recurrenceInput,
    endDate, excludedDates, paid,
    installmentCount,
  } = body;

  if (!title || !amount || !dueDate) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const scope = scopeInput === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'SHARED';
  const recurrence = recurrenceInput === 'RECURRING' ? 'RECURRING' : recurrenceInput === 'INSTALLMENT' ? 'INSTALLMENT' : 'PUNCTUAL';

  if (scope === 'SHARED' && !groupId) {
    return NextResponse.json({ error: 'groupId is required for shared bills' }, { status: 400 });
  }

  const sharesCreate = scope === 'SHARED' && Array.isArray(shares)
    ? shares.map((s: any) => ({ memberId: Number(s.memberId), userId: user.id, amount: s.type === 'value' ? Number(s.amount) : 0, percent: s.type === 'percent' ? Number(s.amount) : null }))
    : undefined;

  // Conta parcelada: materializa N linhas (uma por mês), cada uma com sua
  // própria data de vencimento e status "paga" independente — diferente de
  // RECURRING (indefinida, expandida sob demanda), aqui a contagem é fixa
  // e cada parcela já nasce como um registro real.
  if (recurrence === 'INSTALLMENT') {
    const count = Number(installmentCount);
    if (!Number.isInteger(count) || count < 2 || count > 120) {
      return NextResponse.json({ error: 'installmentCount deve ser um inteiro entre 2 e 120' }, { status: 400 });
    }

    const dueDates = getInstallmentDueDates(new Date(dueDate), count);
    const installmentGroupId = crypto.randomUUID();

    const createdBills = await db.$transaction(
      dueDates.map((occDueDate, i) =>
        db.bill.create({
          data: {
            title,
            description,
            amount: Number(amount),
            dueDate: occDueDate,
            paid: false,
            userId: user.id,
            ...(scope === 'SHARED' ? { groupId: Number(groupId) } : {}),
            scope,
            recurrence,
            endDate: null,
            excludedDates: [],
            paidMonths: [],
            installmentGroupId,
            installmentNumber: i + 1,
            installmentCount: count,
            ...(sharesCreate ? { shares: { create: sharesCreate } } : {}),
          } as any,
          include: { group: true, shares: true },
        })
      )
    );

    return NextResponse.json(createdBills.map(serializeBill), { status: 201 });
  }

  const created = await db.bill.create({
    data: {
      title,
      description,
      amount: Number(amount),
      dueDate: new Date(dueDate),
      paid: !!paid,
      userId: user.id,
      ...(scope === 'SHARED' ? { groupId: Number(groupId) } : {}),
      scope,
      recurrence,
      endDate: recurrence === 'RECURRING' && endDate ? new Date(endDate) : null,
      excludedDates: Array.isArray(excludedDates) ? excludedDates : [],
      paidMonths: [],
      installmentGroupId: null,
      installmentNumber: null,
      installmentCount: null,
      ...(sharesCreate ? { shares: { create: sharesCreate } } : {}),
    } as any,
    include: { group: true, shares: true },
  });

  return NextResponse.json(serializeBill(created), { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Ação dedicada: marcar/desmarcar uma competência específica como paga
  // (usada por contas RECURRING, onde o status é por ciclo mensal).
  if (body.paidMonth && typeof body.paidMonth.monthKey === 'string') {
    const newPaidMonths = toggleBillPaidMonth((existing as any).paidMonths, body.paidMonth.monthKey, !!body.paidMonth.paid);
    const updated = await db.bill.update({
      where: { id: Number(id) },
      data: { paidMonths: newPaidMonths } as any,
      include: { group: true, shares: true },
    });
    return NextResponse.json(serializeBill(updated));
  }

  const {
    title, description, amount, dueDate, groupId, paid, shares,
    scope: scopeInput, recurrence: recurrenceInput, endDate, excludedDates,
  } = body;

  const scope = scopeInput === 'INDIVIDUAL' || scopeInput === 'SHARED' ? scopeInput : undefined;
  const recurrence = recurrenceInput === 'PUNCTUAL' || recurrenceInput === 'RECURRING' || recurrenceInput === 'INSTALLMENT' ? recurrenceInput : undefined;
  const effectiveScope = scope ?? (existing as any).scope ?? 'SHARED';

  if (effectiveScope === 'SHARED' && scope !== undefined && !groupId && !(existing as any).groupId) {
    return NextResponse.json({ error: 'groupId is required for shared bills' }, { status: 400 });
  }

  const updated = await db.bill.update({
    where: { id: Number(id) },
    data: {
      title,
      description,
      amount: amount ? Number(amount) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      paid,
      ...(scope !== undefined ? { scope, groupId: scope === 'INDIVIDUAL' ? null : (groupId ? Number(groupId) : undefined) } : (groupId ? { groupId: Number(groupId) } : {})),
      ...(recurrence !== undefined ? { recurrence } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(excludedDates !== undefined ? { excludedDates: Array.isArray(excludedDates) ? excludedDates : [] } : {}),
    } as any,
    include: { group: true, shares: true },
  });

  // se shares foram enviados, substitui (só faz sentido para contas SHARED)
  if (Array.isArray(shares) && effectiveScope === 'SHARED') {
    await db.billMemberShare.deleteMany({ where: { billId: updated.id } });
    const createData = shares.map((s: any) => ({ billId: updated.id, memberId: Number(s.memberId), userId: user.id, amount: s.type === 'value' ? Number(s.amount) : 0, percent: s.type === 'percent' ? Number(s.amount) : null }));
    if (createData.length > 0) await db.billMemberShare.createMany({ data: createData });
    const reloaded = await db.bill.findUnique({ where: { id: updated.id }, include: { group: true, shares: true } });
    if (reloaded) return NextResponse.json(serializeBill(reloaded));
  } else if (effectiveScope === 'INDIVIDUAL') {
    // conta virou/permaneceu individual: remove eventuais shares antigas
    await db.billMemberShare.deleteMany({ where: { billId: updated.id } });
  }

  return NextResponse.json(serializeBill(updated));
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? url.searchParams.get('billId');
  const mode = url.searchParams.get('mode') ?? 'single'; // 'single' | 'future' | 'all' (parcelas)
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await db.bill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const installmentGroupId = (existing as any).installmentGroupId;
  const installmentNumber = (existing as any).installmentNumber;

  if (installmentGroupId && mode !== 'single') {
    await db.bill.deleteMany({
      where: {
        userId: user.id,
        installmentGroupId,
        ...(mode === 'future' ? { installmentNumber: { gte: installmentNumber } } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  }

  await db.bill.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
