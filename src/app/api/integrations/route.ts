import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const integrationSchema = z.object({
  platform: z.enum(['TELEGRAM', 'WHATSAPP', 'SLACK', 'DISCORD']),
  chatId: z.string().optional(),
  token: z.string().optional(),
  phoneNumber: z.string().optional(),
  enabledCommands: z.array(z.string()).optional(),
  notifyTransactions: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
  notifyAlerts: z.boolean().optional(),
});

/**
 * GET /api/integrations
 * Lista integrações do usuário
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

    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Remove dados sensíveis
    const sanitizedIntegrations = integrations.map((i: any) => ({
      ...i,
      token: undefined,
    }));

    return NextResponse.json({ integrations: sanitizedIntegrations });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar integrações' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Cria nova integração
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
    const validatedData = integrationSchema.parse(body);

    const integration = await prisma.integration.create({
      data: {
        userId: user.id,
        platform: validatedData.platform,
        chatId: validatedData.chatId,
        token: validatedData.token,
        phoneNumber: validatedData.phoneNumber,
        enabledCommands: validatedData.enabledCommands || ['balance', 'expenses', 'summary'],
        notifyTransactions: validatedData.notifyTransactions ?? true,
        notifyGoals: validatedData.notifyGoals ?? true,
        notifyAlerts: validatedData.notifyAlerts ?? true,
      },
    });

    return NextResponse.json({ 
      integration: {
        ...integration,
        token: undefined,
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Erro ao criar integração' },
      { status: 500 }
    );
  }
}
