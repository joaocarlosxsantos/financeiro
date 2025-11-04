/**
 * API: Gera opções de autenticação WebAuthn
 * POST /api/auth/webauthn/authenticate/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptionsForUser } from '@/lib/webauthn-server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email obrigatório' },
        { status: 400 }
      );
    }

    // Busca usuário pelo email
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const options = await generateAuthenticationOptionsForUser(user.id);

    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch (error: any) {
    console.error('Erro ao gerar opções de autenticação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar opções de autenticação' },
      { status: 500 }
    );
  }
}
