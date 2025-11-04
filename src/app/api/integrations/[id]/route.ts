import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processTelegramCommand } from '@/lib/telegram';

/**
 * DELETE /api/integrations/[id]
 * Remove integração
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

    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
    });

    if (!integration || integration.userId !== user.id) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    await prisma.integration.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar integração' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integrations/[id]
 * Atualiza configurações da integração
 */
export async function PATCH(
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

    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
    });

    if (!integration || integration.userId !== user.id) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    const body = await request.json();

    const updatedIntegration = await prisma.integration.update({
      where: { id: params.id },
      data: {
        isActive: body.isActive,
        enabledCommands: body.enabledCommands,
        notifyTransactions: body.notifyTransactions,
        notifyGoals: body.notifyGoals,
        notifyAlerts: body.notifyAlerts,
      },
    });

    return NextResponse.json({ 
      integration: {
        ...updatedIntegration,
        token: undefined,
      }
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar integração' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/[id]/test
 * Testa comando da integração
 */
export async function POST(
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

    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
    });

    if (!integration || integration.userId !== user.id) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { command } = body;

    if (integration.platform === 'TELEGRAM') {
      const response = await processTelegramCommand(user.id, command, []);
      return NextResponse.json({ response });
    }

    return NextResponse.json({ error: 'Plataforma não suportada' }, { status: 400 });
  } catch (error) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { error: 'Erro ao testar integração' },
      { status: 500 }
    );
  }
}
