'use client';

/**
 * Componente: Botão de Login Biométrico
 * Permite login usando Touch ID, Face ID ou Windows Hello
 */

import { useState, useEffect } from 'react';
import { Fingerprint, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isWebAuthnAvailable,
  isPlatformAuthenticatorAvailable,
  authenticateWithBiometric,
} from '@/lib/webauthn-client';
import { signIn } from 'next-auth/react';

interface BiometricLoginButtonProps {
  email?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function BiometricLoginButton({ 
  email, 
  onSuccess, 
  onError 
}: BiometricLoginButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformSupported, setIsPlatformSupported] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkSupport();
  }, []);

  async function checkSupport() {
    const supported = isWebAuthnAvailable();
    setIsSupported(supported);

    if (supported) {
      const platformSupported = await isPlatformAuthenticatorAvailable();
      setIsPlatformSupported(platformSupported);
    }
  }

  async function handleBiometricLogin() {
    if (!email) {
      onError?.('Digite seu email primeiro');
      return;
    }

    try {
      setIsAuthenticating(true);

      // Autentica usando WebAuthn
      const result = await authenticateWithBiometric(email);

      if (result.success) {
        // Cria sessão usando NextAuth
        const signInResult = await signIn('credentials', {
          email: result.user.email,
          biometric: 'true',
          redirect: false,
        });

        if (signInResult?.ok) {
          onSuccess?.();
        } else {
          throw new Error('Erro ao criar sessão');
        }
      }
    } catch (error: any) {
      console.error('Erro no login biométrico:', error);
      onError?.(error.message || 'Erro ao autenticar com biometria');
    } finally {
      setIsAuthenticating(false);
    }
  }

  // Não renderiza se não suportado ou ainda não montado
  if (!mounted || !isSupported) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou continue com
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleBiometricLogin}
        disabled={isAuthenticating || !email}
      >
        {isAuthenticating ? (
          <>
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Autenticando...
          </>
        ) : (
          <>
            <Fingerprint className="h-4 w-4" />
            {isPlatformSupported ? 'Login com Biometria' : 'Login com Chave de Segurança'}
          </>
        )}
      </Button>

      {isPlatformSupported && (
        <p className="text-xs text-center text-muted-foreground">
          Use Touch ID, Face ID ou Windows Hello
        </p>
      )}
    </div>
  );
}
