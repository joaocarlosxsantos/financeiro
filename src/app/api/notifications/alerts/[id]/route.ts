import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/notifications/alerts/[id] - Delete alert configuration
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { id } = params;

    // Check if configuration exists and belongs to user
    const existingConfig = await prisma.alertConfiguration.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    // Delete the configuration
    await prisma.alertConfiguration.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Configuração de alerta excluída com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao excluir configuração de alerta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/alerts/[id] - Update alert configuration
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { id } = params;
    const body = await req.json();

    // Check if configuration exists and belongs to user
    const existingConfig = await prisma.alertConfiguration.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    // Update the configuration
    const updatedConfig = await prisma.alertConfiguration.update({
      where: { id },
      data: {
        isEnabled: body.isEnabled ?? existingConfig.isEnabled,
        thresholdAmount: body.thresholdAmount ?? existingConfig.thresholdAmount,
        thresholdPercent: body.thresholdPercent ?? existingConfig.thresholdPercent,
        categoryIds: body.categoryIds ?? existingConfig.categoryIds,
        walletIds: body.walletIds ?? existingConfig.walletIds,
        settings: body.settings ?? existingConfig.settings,
      }
    });

    return NextResponse.json({ 
      success: true, 
      configuration: updatedConfig,
      message: 'Configuração atualizada com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao atualizar configuração de alerta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}