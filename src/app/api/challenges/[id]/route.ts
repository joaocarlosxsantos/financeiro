import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { grantAchievement } from '@/lib/achievement-checker';

const updateProgressSchema = z.object({
  current: z.number().min(0),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED']),
});

/**
 * GET /api/challenges/[id]
 * Retorna um desafio específico
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const challenge = await prisma.challenge.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Desafio não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error('Erro ao buscar challenge:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar desafio' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/challenges/[id]
 * Atualiza o progresso de um desafio
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const challenge = await prisma.challenge.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Desafio não encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    
    // Tenta validar como update de progresso ou status
    let validatedData: any;
    let isProgressUpdate = false;

    try {
      validatedData = updateProgressSchema.parse(body);
      isProgressUpdate = true;
    } catch {
      validatedData = updateStatusSchema.parse(body);
    }

    let updateData: any = {};

    if (isProgressUpdate) {
      // Atualização de progresso
      updateData.current = validatedData.current;

      // Verifica se completou o desafio
      if (validatedData.current >= Number(challenge.goal)) {
        updateData.status = 'COMPLETED';
        
        // Concede conquista se for o primeiro desafio completado
        const completedCount = await prisma.challenge.count({
          where: {
            userId: user.id,
            status: 'COMPLETED',
          },
        });

        if (completedCount === 0) {
          await grantAchievement(user.id, 'GOAL_ACHIEVED');
        }

        // Atualiza estatísticas
        await prisma.userStats.update({
          where: { userId: user.id },
          data: {
            totalChallengesCompleted: { increment: 1 },
          },
        });
      }
    } else {
      // Atualização de status
      updateData.status = validatedData.status;

      if (validatedData.status === 'COMPLETED') {
        // Atualiza estatísticas
        await prisma.userStats.update({
          where: { userId: user.id },
          data: {
            totalChallengesCompleted: { increment: 1 },
          },
        });
      }
    }

    const updatedChallenge = await prisma.challenge.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedChallenge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar challenge:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar desafio' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/challenges/[id]
 * Remove um desafio
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const challenge = await prisma.challenge.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Desafio não encontrado' },
        { status: 404 }
      );
    }

    await prisma.challenge.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar challenge:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar desafio' },
      { status: 500 }
    );
  }
}
