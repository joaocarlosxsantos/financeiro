import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AlertConfigType } from '@/types/notifications';
import { z } from 'zod';

const alertConfigSchema = z.object({
  type: z.nativeEnum(AlertConfigType),
  isEnabled: z.boolean(),
  thresholdAmount: z.number().positive().optional().nullable().transform(val => val ?? undefined),
  thresholdPercent: z.number().min(0).max(100).optional().nullable().transform(val => val ?? undefined),
  categoryIds: z.array(z.string()).optional().nullable().transform(val => val ?? undefined),
  walletIds: z.array(z.string()).optional().nullable().transform(val => val ?? undefined),
  settings: z.any().optional().nullable().transform(val => val ?? undefined),
});

// GET /api/notifications/alerts - Get alert configurations
export async function GET(req: NextRequest) {
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

    const alertConfigurations = await prisma.alertConfiguration.findMany({
      where: { userId: user.id },
      orderBy: { type: 'asc' }
    });

    return NextResponse.json({ configurations: alertConfigurations });

  } catch (error) {
    console.error('Error fetching alert configurations:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/notifications/alerts - Create or update alert configuration
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = alertConfigSchema.parse(body);

    const alertConfiguration = await prisma.alertConfiguration.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: validatedData.type
        }
      },
      update: {
        isEnabled: validatedData.isEnabled,
        thresholdAmount: validatedData.thresholdAmount,
        thresholdPercent: validatedData.thresholdPercent,
        categoryIds: validatedData.categoryIds || [],
        walletIds: validatedData.walletIds || [],
        settings: validatedData.settings || {},
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        type: validatedData.type,
        isEnabled: validatedData.isEnabled,
        thresholdAmount: validatedData.thresholdAmount,
        thresholdPercent: validatedData.thresholdPercent,
        categoryIds: validatedData.categoryIds || [],
        walletIds: validatedData.walletIds || [],
        settings: validatedData.settings || {},
      }
    });

    return NextResponse.json(alertConfiguration);

  } catch (error) {
    console.error('Error saving alert configuration:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}