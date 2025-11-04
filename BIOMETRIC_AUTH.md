# 🔐 Autenticação Biométrica

Sistema de autenticação biométrica usando **WebAuthn** (FIDO2) para login sem senha.

## 📋 Visão Geral

A autenticação biométrica permite que usuários façam login usando:
- **Touch ID** (iPhone, iPad, MacBook)
- **Face ID** (iPhone, iPad Pro, MacBook Pro)
- **Windows Hello** (Windows 10/11 com biometria)
- **Chaves de Segurança** (YubiKey, etc.)

## 🎯 Funcionalidades

### ✅ Registro de Dispositivos
- Registre múltiplos dispositivos biométricos
- Nomeie cada dispositivo para fácil identificação
- Suporte a autenticadores de plataforma e cross-platform

### 🔒 Login Seguro
- Login sem senha usando biometria
- Resistente a phishing (FIDO2)
- Contador de replay attack
- Verificação de origem e domínio

### 📊 Gerenciamento
- Visualize todos dispositivos registrados
- Estatísticas de uso (último uso, quantidade)
- Remova dispositivos não utilizados

## 🏗️ Arquitetura

### Backend (Server)
```
lib/webauthn-server.ts
├── generateRegistrationOptionsForUser()    - Gera desafio de registro
├── verifyRegistrationResponseForUser()     - Verifica registro
├── generateAuthenticationOptionsForUser()  - Gera desafio de autenticação
├── verifyAuthenticationResponseForUser()   - Verifica autenticação
├── getUserAuthenticators()                 - Lista dispositivos
└── removeAuthenticator()                   - Remove dispositivo
```

### Frontend (Client)
```
lib/webauthn-client.ts
├── isWebAuthnAvailable()                   - Verifica suporte
├── isPlatformAuthenticatorAvailable()      - Verifica Touch ID/Face ID
├── registerBiometric()                     - Registra dispositivo
├── authenticateWithBiometric()             - Autentica usuário
└── listAuthenticators()                    - Lista dispositivos
```

### APIs
```
/api/auth/webauthn/
├── register/
│   ├── generate/     - POST: Gera opções de registro
│   └── verify/       - POST: Verifica resposta de registro
├── authenticate/
│   ├── generate/     - POST: Gera opções de autenticação
│   └── verify/       - POST: Verifica resposta de autenticação
└── authenticators/   - GET/DELETE: Gerencia dispositivos
```

### Database
```prisma
model Authenticator {
  id                   String   @id @default(cuid())
  credentialID         String   @unique
  credentialPublicKey  Bytes
  counter              BigInt   @default(0)
  deviceName           String?
  deviceType           String?
  transports           String[]
  aaguid               String?
  lastUsed             DateTime?
  usageCount           Int      @default(0)
  userId               String
  user                 User     @relation("UserAuthenticators")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

```env
# WebAuthn Configuration
NEXT_PUBLIC_RP_ID="localhost"              # Para desenvolvimento
NEXT_PUBLIC_ORIGIN="http://localhost:3000" # Para desenvolvimento

# Em produção:
NEXT_PUBLIC_RP_ID="app.seudominio.com"
NEXT_PUBLIC_ORIGIN="https://app.seudominio.com"
```

⚠️ **Importante:**
- `RP_ID` = domínio sem protocolo
- `ORIGIN` = URL completa com protocolo
- Em produção, use HTTPS obrigatoriamente

### 2. Registrar Dispositivo

**Via UI:**
1. Acesse `/biometria`
2. Digite nome do dispositivo
3. Clique em "Registrar"
4. Confirme biometria quando solicitado

**Via API:**
```typescript
import { registerBiometric } from '@/lib/webauthn-client';

await registerBiometric('iPhone 15 Pro');
```

### 3. Login com Biometria

**Na página de login:**
```tsx
import { BiometricLoginButton } from '@/components/auth/biometric-login-button';

<BiometricLoginButton
  email={email}
  onSuccess={() => router.push('/dashboard')}
  onError={(error) => alert(error)}
/>
```

**Programaticamente:**
```typescript
import { authenticateWithBiometric } from '@/lib/webauthn-client';

const result = await authenticateWithBiometric('usuario@example.com');
if (result.success) {
  // Criar sessão
}
```

## 🔧 Integração com NextAuth

A autenticação biométrica deve ser integrada como um provider do NextAuth:

```typescript
// lib/auth.ts
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyAuthenticationResponseForUser } from '@/lib/webauthn-server';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'WebAuthn',
      credentials: {
        email: { label: 'Email', type: 'text' },
        biometric: { label: 'Biometric', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.biometric === 'true') {
          // Usuário já foi autenticado via WebAuthn
          // Buscar usuário pelo email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          return user;
        }
        // ... outros métodos de autenticação
      },
    }),
  ],
};
```

## 🛡️ Segurança

### Recursos de Segurança
- ✅ **Resistente a Phishing**: Credenciais vinculadas ao domínio
- ✅ **Sem Vazamento de Senha**: Não usa senhas
- ✅ **Criptografia Assimétrica**: Chave privada nunca sai do dispositivo
- ✅ **Contador de Replay**: Previne ataques de repetição
- ✅ **Verificação de Origem**: Valida domínio e origem
- ✅ **User Verification**: Requer biometria ou PIN

### Proteções Implementadas
```typescript
// Verificação de origem
expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN

// Verificação de RP ID
expectedRPID: process.env.NEXT_PUBLIC_RP_ID

// Contador anti-replay
counter: BigInt(counter)

// User verification preferencial
userVerification: 'preferred'
```

## 📱 Suporte de Navegadores

| Navegador | Desktop | Mobile | Notas |
|-----------|---------|--------|-------|
| Chrome    | ✅      | ✅     | Suporte completo |
| Edge      | ✅      | ✅     | Windows Hello |
| Safari    | ✅      | ✅     | Touch ID, Face ID |
| Firefox   | ✅      | ✅     | Chaves de segurança |
| Opera     | ✅      | ❌     | Desktop apenas |

### Verificar Suporte
```typescript
import { isWebAuthnAvailable, isPlatformAuthenticatorAvailable } from '@/lib/webauthn-client';

const supported = isWebAuthnAvailable();
const platformSupported = await isPlatformAuthenticatorAvailable();

if (platformSupported) {
  console.log('Touch ID/Face ID disponível!');
}
```

## 🧪 Testando

### Desenvolvimento Local

1. **HTTPS não é obrigatório** para localhost
2. Use `RP_ID="localhost"` e `ORIGIN="http://localhost:3000"`
3. Testável em navegadores modernos

### Produção

1. **HTTPS é obrigatório**
2. Configure `RP_ID` com seu domínio
3. Configure `ORIGIN` com URL completa HTTPS
4. Teste em múltiplos dispositivos

### Simulando Biometria

**macOS/iOS:**
- Safari > Develop > WebAuthn > Enable WebAuthn
- Simula Touch ID/Face ID em dispositivos Apple

**Windows:**
- Edge > DevTools > WebAuthn
- Simula Windows Hello

**Chrome:**
- Chrome DevTools > WebAuthn
- Adiciona autenticadores virtuais

## 📊 Monitoramento

### Estatísticas de Uso
```typescript
const authenticators = await getUserAuthenticators(userId);

authenticators.forEach(auth => {
  console.log(`
    Dispositivo: ${auth.deviceName}
    Usos: ${auth.usageCount}
    Último uso: ${auth.lastUsed}
  `);
});
```

### Logs de Auditoria
```typescript
// Cada autenticação atualiza:
- counter (previne replay)
- lastUsed (timestamp)
- usageCount (incrementa)
```

## 🔄 Fluxo de Autenticação

### Registro
```
1. Usuário: "Registrar dispositivo"
   ↓
2. Frontend: Solicita opções ao servidor
   ↓
3. Backend: Gera challenge e opções
   ↓
4. Frontend: navigator.credentials.create()
   ↓
5. Dispositivo: Solicita biometria ao usuário
   ↓
6. Frontend: Envia resposta ao servidor
   ↓
7. Backend: Verifica e salva credencial
```

### Autenticação
```
1. Usuário: "Login com biometria"
   ↓
2. Frontend: Solicita opções ao servidor
   ↓
3. Backend: Gera challenge com credenciais do usuário
   ↓
4. Frontend: navigator.credentials.get()
   ↓
5. Dispositivo: Solicita biometria ao usuário
   ↓
6. Frontend: Envia resposta ao servidor
   ↓
7. Backend: Verifica assinatura e cria sessão
```

## ⚠️ Limitações

- **HTTPS obrigatório** em produção (localhost exceção)
- **Suporte limitado** em navegadores antigos
- **Credenciais não sincronizam** entre dispositivos automaticamente
- **Requer hardware** compatível (sensor biométrico ou chave)

## 🆘 Troubleshooting

### Erro: "NotAllowedError"
- **Causa**: Usuário cancelou ou browser bloqueou
- **Solução**: Verificar permissões do browser

### Erro: "InvalidStateError" (registro)
- **Causa**: Dispositivo já registrado
- **Solução**: Remover registro anterior

### Erro: "SecurityError"
- **Causa**: RP_ID não corresponde ao domínio
- **Solução**: Verificar variáveis de ambiente

### Erro: "NotSupportedError"
- **Causa**: Browser não suporta WebAuthn
- **Solução**: Atualizar browser ou usar alternativa

## 📚 Referências

- [WebAuthn Specification](https://www.w3.org/TR/webauthn/)
- [FIDO Alliance](https://fidoalliance.org/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [MDN WebAuthn API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)

## 🎨 UI Components

### Página de Configuração
`/biometria` - Gerenciamento de dispositivos

### Componente de Login
`BiometricLoginButton` - Botão para página de login

### Hooks Customizados
```typescript
// Verificar suporte
const isSupported = isWebAuthnAvailable();

// Registrar
await registerBiometric('Meu iPhone');

// Autenticar
await authenticateWithBiometric('user@example.com');

// Listar
const devices = await listAuthenticators();

// Remover
await removeAuthenticatorById(id);
```

---

✨ **Autenticação biométrica implementada com sucesso!**
