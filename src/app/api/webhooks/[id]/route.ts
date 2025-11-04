import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/webhooks/[id]
 * Remove webhook
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

    // Verifica se o webhook pertence ao usuário
    const webhook = await prisma.webhook.findUnique({
      where: { id: params.id },
    });

    if (!webhook || webhook.userId !== user.id) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 });
    }

    await prisma.webhook.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar webhook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks/[id]
 * Ativa/desativa webhook
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

    const body = await request.json();
    const { isActive } = body;

    // Verifica se o webhook pertence ao usuário
    const webhook = await prisma.webhook.findUnique({
      where: { id: params.id },
    });

    if (!webhook || webhook.userId !== user.id) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 });
    }

    const updatedWebhook = await prisma.webhook.update({
      where: { id: params.id },
      data: { isActive },
    });

    return NextResponse.json({ 
      webhook: {
        ...updatedWebhook,
        secret: undefined,
      }
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar webhook' },
      { status: 500 }
    );
  }
}
