/**
 * WebAuthn Helper - Cliente
 * 
 * Gerencia autenticação biométrica no navegador
 * @module lib/webauthn-client
 */

import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

/**
 * Verifica se WebAuthn está disponível no navegador
 */
export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Verifica se autenticação de plataforma (Touch ID, Face ID) está disponível
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Erro ao verificar autenticador de plataforma:', error);
    return false;
  }
}

/**
 * Registra novo autenticador biométrico
 */
export async function registerBiometric(deviceName?: string) {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn não disponível neste navegador');
  }

  try {
    // 1. Solicita opções de registro ao servidor
    const generateResponse = await fetch('/api/auth/webauthn/register/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!generateResponse.ok) {
      const error = await generateResponse.json();
      throw new Error(error.error || 'Erro ao gerar opções de registro');
    }

    const { options, challenge } = await generateResponse.json();

    // 2. Inicia registro no navegador (solicita biometria)
    const registrationResponse = await startRegistration(options);

    // 3. Verifica resposta no servidor
    const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: registrationResponse,
        challenge,
        deviceName,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || 'Erro ao verificar registro');
    }

    const result = await verifyResponse.json();
    return result;
  } catch (error: any) {
    console.error('Erro ao registrar biometria:', error);
    
    // Traduz erros comuns
    if (error.name === 'NotAllowedError') {
      throw new Error('Registro cancelado ou não autorizado');
    }
    if (error.name === 'InvalidStateError') {
      throw new Error('Este dispositivo já está registrado');
    }
    
    throw error;
  }
}

/**
 * Autentica usando biometria
 */
export async function authenticateWithBiometric(email: string) {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn não disponível neste navegador');
  }

  try {
    // 1. Solicita opções de autenticação ao servidor
    const generateResponse = await fetch('/api/auth/webauthn/authenticate/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!generateResponse.ok) {
      const error = await generateResponse.json();
      throw new Error(error.error || 'Erro ao gerar opções de autenticação');
    }

    const { options, challenge } = await generateResponse.json();

    // 2. Inicia autenticação no navegador (solicita biometria)
    const authenticationResponse = await startAuthentication(options);

    // 3. Verifica resposta no servidor
    const verifyResponse = await fetch('/api/auth/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: authenticationResponse,
        challenge,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || 'Erro ao verificar autenticação');
    }

    const result = await verifyResponse.json();
    return result;
  } catch (error: any) {
    console.error('Erro ao autenticar com biometria:', error);
    
    // Traduz erros comuns
    if (error.name === 'NotAllowedError') {
      throw new Error('Autenticação cancelada ou não autorizada');
    }
    if (error.name === 'InvalidStateError') {
      throw new Error('Nenhum autenticador disponível');
    }
    
    throw error;
  }
}

/**
 * Lista autenticadores do usuário
 */
export async function listAuthenticators() {
  const response = await fetch('/api/auth/webauthn/authenticators');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar autenticadores');
  }

  const { authenticators } = await response.json();
  return authenticators;
}

/**
 * Remove autenticador
 */
export async function removeAuthenticatorById(authenticatorId: string) {
  const response = await fetch('/api/auth/webauthn/authenticators', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authenticatorId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao remover autenticador');
  }

  return true;
}
