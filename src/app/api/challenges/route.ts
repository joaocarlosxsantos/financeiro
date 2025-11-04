import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const challengeSchema = z.object({
  type: z.enum([
    'SAVINGS',
    'NO_SPEND',
    'BUDGET_LIMIT',
    'INCOME_INCREASE',
    'DEBT_REDUCTION',
    'CATEGORY_CONTROL',
    'CUSTOM',
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  goal: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).optional(),
  categoryId: z.string().optional(),
  reward: z.string().optional(),
});

/**
 * GET /api/challenges
 * Retorna todos os desafios do usuário
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const challenges = await prisma.challenge.findMany({
      where: {
        userId: user.id,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error('Erro ao buscar challenges:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar desafios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/challenges
 * Cria um novo desafio
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = challengeSchema.parse(body);

    const challenge = await prisma.challenge.create({
      data: {
        userId: user.id,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        goal: validatedData.goal,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        difficulty: validatedData.difficulty || 'MEDIUM',
        categoryId: validatedData.categoryId,
        reward: validatedData.reward,
        current: 0,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao criar challenge:', error);
    return NextResponse.json(
      { error: 'Erro ao criar desafio' },
      { status: 500 }
    );
  }
}
