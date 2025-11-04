/**
 * API: Gera opções de registro WebAuthn
 * POST /api/auth/webauthn/register/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateRegistrationOptionsForUser } from '@/lib/webauthn-server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const email = session.user.email!;

    const options = await generateRegistrationOptionsForUser(userId, email);

    // Armazena challenge na sessão (simplificado - em produção usar Redis)
    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch (error: any) {
    console.error('Erro ao gerar opções de registro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar opções de registro' },
      { status: 500 }
    );
  }
}
