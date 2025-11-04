/**
 * API: Verifica resposta de autenticação WebAuthn
 * POST /api/auth/webauthn/authenticate/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponseForUser } from '@/lib/webauthn-server';

export async function POST(req: NextRequest) {
  try {
    const { response, challenge } = await req.json();

    if (!response || !challenge) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    const result = await verifyAuthenticationResponseForUser(response, challenge);

    if (!result.verified) {
      return NextResponse.json(
        { error: 'Autenticação falhou' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error: any) {
    console.error('Erro ao verificar autenticação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar autenticação' },
      { status: 500 }
    );
  }
}
