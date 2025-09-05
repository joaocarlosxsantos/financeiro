import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  const id = Number(memberId);
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || member.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // verifica se existe qualquer share vinculado ao membro
  const existShare = await prisma.billMemberShare.findFirst({ where: { memberId: id } });
  return NextResponse.json({ hasLinks: !!existShare });
}
