import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/scenarios/[id]
 * Retorna um cenário específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const scenario = await prisma.scenario.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Cenário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cenário' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scenarios/[id]
 * Remove um cenário
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const scenario = await prisma.scenario.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Cenário não encontrado' }, { status: 404 });
    }

    await prisma.scenario.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar cenário' },
      { status: 500 }
    );
  }
}
