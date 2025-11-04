import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  filters: z.any().optional(),
});

/**
 * GET /api/webhooks
 * Lista webhooks do usuário
 */
export async function GET(request: NextRequest) {
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

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Remove secrets da resposta
    const sanitizedWebhooks = webhooks.map((w: any) => ({
      ...w,
      secret: undefined,
    }));

    return NextResponse.json({ webhooks: sanitizedWebhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks
 * Cria novo webhook
 */
export async function POST(request: NextRequest) {
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
    const validatedData = webhookSchema.parse(body);

    // Gera secret aleatório
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        url: validatedData.url,
        secret,
        events: validatedData.events,
        filters: validatedData.filters,
      },
    });

    return NextResponse.json({ 
      webhook: {
        ...webhook,
        secret, // Retorna o secret apenas na criação
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao criar webhook' },
      { status: 500 }
    );
  }
}
