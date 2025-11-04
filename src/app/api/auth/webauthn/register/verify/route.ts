/**
 * API: Verifica resposta de registro WebAuthn
 * POST /api/auth/webauthn/register/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyRegistrationResponseForUser } from '@/lib/webauthn-server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { response, challenge, deviceName } = await req.json();

    if (!response || !challenge) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    const authenticator = await verifyRegistrationResponseForUser(
      userId,
      response,
      challenge
    );

    // Atualiza nome do dispositivo se fornecido
    if (deviceName && authenticator) {
      const { prisma } = await import('@/lib/prisma');
      await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: { deviceName },
      });
    }

    return NextResponse.json({
      success: true,
      authenticator: {
        id: authenticator.id,
        deviceName: authenticator.deviceName,
        createdAt: authenticator.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erro ao verificar registro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar registro' },
      { status: 500 }
    );
  }
}
