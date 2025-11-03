import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { withUserRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return await prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  
  const apiKey = user.apiKey;
  if (!apiKey) {
    return NextResponse.json({ apiKey: null, hasKey: false });
  }
  
  // Verificar se o usuário solicitou revelar a chave completa
  const { searchParams } = new URL(req.url);
  const reveal = searchParams.get('reveal') === 'true';
  
  if (reveal) {
    // Retorna chave completa apenas quando explicitamente solicitado (ex: ao copiar)
    return NextResponse.json({ 
      apiKey: apiKey,
      hasKey: true 
    });
  }
  
  // Por padrão, retorna apenas preview mascarado para evitar exposição em logs
  return NextResponse.json({ 
    apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
    hasKey: true 
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  
  // Apply rate limiting
  const rateLimitResponse = await withUserRateLimit(req, user.id, RATE_LIMITS.APIKEY_OPERATIONS);
  if (rateLimitResponse) return rateLimitResponse;
  
  const apiKey = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { apiKey } });
  return NextResponse.json({ apiKey }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  
  // Apply rate limiting
  const rateLimitResponse = await withUserRateLimit(req, user.id, RATE_LIMITS.APIKEY_OPERATIONS);
  if (rateLimitResponse) return rateLimitResponse;
  
  await prisma.user.update({ where: { id: user.id }, data: { apiKey: null } });
  return NextResponse.json({ ok: true });
}
