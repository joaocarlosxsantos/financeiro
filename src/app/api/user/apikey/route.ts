import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return await prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  // Return full key for copying in UI. Be careful in logs.
  return NextResponse.json({ apiKey: user.apiKey ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const apiKey = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { apiKey } });
  return NextResponse.json({ apiKey }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { apiKey: null } });
  return NextResponse.json({ ok: true });
}
