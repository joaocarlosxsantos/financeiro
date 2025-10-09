import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AlertConfigType } from '@/types/notifications';
import { z } from 'zod';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { 
  secureAlertSchemas, 
  validateAndSanitize, 
  logValidationError,
  detectAttackAttempt 
} from '@/lib/validation';

const alertConfigSchema = secureAlertSchemas.create;

// GET /api/notifications/alerts - Get alert configurations
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.ALERTS_CONFIG);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.ALERTS_CONFIG);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
    
    // Enhanced validation with attack detection
    const attackDetection = detectAttackAttempt(JSON.stringify(body));
    if (attackDetection.isAttack) {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      logValidationError('/api/notifications/alerts', user.id, ip, [
        `Tentativa de ataque detectada: ${attackDetection.attackType} (confiança: ${attackDetection.confidence})`
      ]);
      return NextResponse.json({ 
        error: 'Dados inválidos' 
      }, { status: 400 });
    }

    const validation = await validateAndSanitize(alertConfigSchema, body);
    if (!validation.success) {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      logValidationError('/api/notifications/alerts', user.id, ip, validation.errors);
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: validation.errors 
      }, { status: 400 });
    }

    const validatedData = validation.data;

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