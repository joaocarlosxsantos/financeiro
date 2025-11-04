/**
 * WebAuthn Helper - Servidor
 * 
 * Gerencia autenticação biométrica usando WebAuthn API
 * @module lib/webauthn-server
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { prisma } from './prisma';

// Configuração do RP (Relying Party)
const rpName = 'Financeiro App';
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

/**
 * Gera opções para registro de novo autenticador
 */
export async function generateRegistrationOptionsForUser(userId: string, email: string) {
  // Busca autenticadores existentes do usuário
  const userAuthenticators = await prisma.authenticator.findMany({
    where: { userId },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: email,
    userDisplayName: email,
    attestationType: 'none',
    excludeCredentials: userAuthenticators.map((authenticator: any) => ({
      id: Buffer.from(authenticator.credentialID, 'base64url'),
      type: 'public-key',
      transports: authenticator.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefere autenticadores internos (Touch ID, Face ID)
    },
  });

  return options;
}

/**
 * Verifica resposta de registro
 */
export async function verifyRegistrationResponseForUser(
  userId: string,
  response: any,
  challenge: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Verificação falhou');
  }

  const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

  // Salva autenticador no banco
  const authenticator = await prisma.authenticator.create({
    data: {
      userId,
      credentialID: Buffer.from(credentialID).toString('base64url'),
      credentialPublicKey: Buffer.from(credentialPublicKey),
      counter: BigInt(counter),
      transports: response.response.transports || [],
    },
  });

  return authenticator;
}

/**
 * Gera opções para autenticação
 */
export async function generateAuthenticationOptionsForUser(userId?: string) {
  let allowCredentials;

  if (userId) {
    // Busca autenticadores do usuário específico
    const userAuthenticators = await prisma.authenticator.findMany({
      where: { userId },
    });

    allowCredentials = userAuthenticators.map((authenticator: any) => ({
      id: Buffer.from(authenticator.credentialID, 'base64url'),
      type: 'public-key' as const,
      transports: authenticator.transports,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  return options;
}

/**
 * Verifica resposta de autenticação
 */
export async function verifyAuthenticationResponseForUser(
  response: any,
  challenge: string
) {
  // Busca autenticador pela credentialID
  const credentialID = response.id;
  
  const authenticator = await prisma.authenticator.findUnique({
    where: { credentialID },
    include: { user: true },
  });

  if (!authenticator) {
    throw new Error('Autenticador não encontrado');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
      credentialPublicKey: authenticator.credentialPublicKey,
      counter: Number(authenticator.counter),
    },
  });

  if (!verification.verified) {
    throw new Error('Autenticação falhou');
  }

  // Atualiza contador e estatísticas
  await prisma.authenticator.update({
    where: { id: authenticator.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsed: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    verified: true,
    user: authenticator.user,
  };
}

/**
 * Remove autenticador
 */
export async function removeAuthenticator(userId: string, authenticatorId: string) {
  const authenticator = await prisma.authenticator.findUnique({
    where: { id: authenticatorId },
  });

  if (!authenticator || authenticator.userId !== userId) {
    throw new Error('Autenticador não encontrado');
  }

  await prisma.authenticator.delete({
    where: { id: authenticatorId },
  });

  return true;
}

/**
 * Lista autenticadores do usuário
 */
export async function getUserAuthenticators(userId: string) {
  const authenticators = await prisma.authenticator.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      deviceType: true,
      transports: true,
      lastUsed: true,
      usageCount: true,
      createdAt: true,
    },
  });

  return authenticators;
}
