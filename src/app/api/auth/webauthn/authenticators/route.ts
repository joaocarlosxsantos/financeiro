/**
 * API: Lista e gerencia autenticadores do usuário
 * GET/DELETE /api/auth/webauthn/authenticators
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserAuthenticators, removeAuthenticator } from '@/lib/webauthn-server';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const authenticators = await getUserAuthenticators(userId);

    return NextResponse.json({ authenticators });
  } catch (error: any) {
    console.error('Erro ao listar autenticadores:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar autenticadores' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { authenticatorId } = await req.json();

    if (!authenticatorId) {
      return NextResponse.json(
        { error: 'ID do autenticador obrigatório' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    await removeAuthenticator(userId, authenticatorId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover autenticador:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao remover autenticador' },
      { status: 500 }
    );
  }
}
