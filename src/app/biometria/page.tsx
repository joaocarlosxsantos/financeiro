'use client';

/**
 * Página: Autenticação Biométrica
 * Gerencia registro e remoção de autenticadores
 */

import { useEffect, useState } from 'react';
import { Fingerprint, Smartphone, Trash2, Plus, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  isWebAuthnAvailable,
  isPlatformAuthenticatorAvailable,
  registerBiometric,
  listAuthenticators,
  removeAuthenticatorById,
} from '@/lib/webauthn-client';

interface Authenticator {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  transports: string[];
  lastUsed: Date | null;
  usageCount: number;
  createdAt: Date;
}

export default function BiometricAuthPage() {
  const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformSupported, setIsPlatformSupported] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkSupport();
    loadAuthenticators();
  }, []);

  async function checkSupport() {
    const supported = isWebAuthnAvailable();
    setIsSupported(supported);

    if (supported) {
      const platformSupported = await isPlatformAuthenticatorAvailable();
      setIsPlatformSupported(platformSupported);
    }
  }

  async function loadAuthenticators() {
    try {
      setLoading(true);
      const data = await listAuthenticators();
      setAuthenticators(data);
    } catch (error: any) {
      console.error('Erro ao carregar autenticadores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!deviceName.trim()) {
      setError('Digite um nome para o dispositivo');
      return;
    }

    try {
      setIsRegistering(true);
      setError('');
      setSuccess('');

      await registerBiometric(deviceName);

      setSuccess('Biometria registrada com sucesso!');
      setDeviceName('');
      await loadAuthenticators();
    } catch (error: any) {
      setError(error.message || 'Erro ao registrar biometria');
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRemove(authenticatorId: string) {
    if (!confirm('Deseja remover este autenticador?')) return;

    try {
      await removeAuthenticatorById(authenticatorId);
      setSuccess('Autenticador removido com sucesso');
      await loadAuthenticators();
    } catch (error: any) {
      setError(error.message || 'Erro ao remover autenticador');
    }
  }

  if (!isSupported) {
    return (
      <div className="w-full space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Autenticação Biométrica</h1>
          <p className="text-muted-foreground">
            Seu navegador não suporta WebAuthn
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                WebAuthn não disponível
              </h3>
              <p className="text-muted-foreground max-w-md">
                Seu navegador não suporta autenticação biométrica (WebAuthn).
                Atualize para a versão mais recente ou use um navegador moderno.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Fingerprint className="h-8 w-8" />
          Autenticação Biométrica
        </h1>
        <p className="text-muted-foreground">
          Configure login com biometria (Touch ID, Face ID, Windows Hello)
        </p>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Informações */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>🔐 Mais seguro:</strong> Autenticação biométrica é resistente a phishing e mais segura que senhas.
          </p>
          <p>
            <strong>⚡ Mais rápido:</strong> Login instantâneo com seu dedo ou rosto, sem digitar senhas.
          </p>
          <p>
            <strong>📱 Suporte:</strong> {isPlatformSupported ? 'Touch ID, Face ID e Windows Hello disponíveis' : 'Apenas chaves de segurança disponíveis'}
          </p>
        </CardContent>
      </Card>

      {/* Registrar novo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registrar Novo Dispositivo</CardTitle>
          <CardDescription>
            Adicione biometria deste dispositivo para login rápido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome do dispositivo (ex: iPhone 15 Pro)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border bg-background"
              disabled={isRegistering}
            />
            <Button
              onClick={handleRegister}
              disabled={isRegistering || !deviceName.trim()}
              className="gap-2"
            >
              {isRegistering ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Registrar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de autenticadores */}
      <Card>
        <CardHeader>
          <CardTitle>Dispositivos Registrados</CardTitle>
          <CardDescription>
            {authenticators.length} dispositivo(s) configurado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : authenticators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum dispositivo registrado</p>
              <p className="text-sm mt-1">
                Registre seu primeiro dispositivo acima
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {authenticators.map((auth) => (
                <div
                  key={auth.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Fingerprint className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {auth.deviceName || 'Dispositivo sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {auth.usageCount} uso(s) •{' '}
                        {auth.lastUsed
                          ? `Último: ${new Date(auth.lastUsed).toLocaleDateString()}`
                          : 'Nunca usado'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(auth.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
