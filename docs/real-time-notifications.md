# Sistema de Notificações em Tempo Real

## Visão Geral

O sistema de notificações em tempo real foi implementado usando **Server-Sent Events (SSE)** para fornecer notificações instantâneas aos usuários com excelente UX e performance.

## Arquitetura

### Componentes Principais

1. **API de Streaming** (`/src/app/api/notifications/stream/route.ts`)
   - Gerencia conexões SSE por usuário
   - Heartbeat automático para manter conexões vivas
   - Rate limiting para prevenir abuso
   - Limpeza automática de conexões inativas

2. **Hook React** (`/src/hooks/use-notification-stream.ts`)
   - Gerencia estado de conexão
   - Reconexão automática
   - Buffer de notificações
   - Callbacks personalizáveis

3. **Componente de UI** (`/src/components/notifications/NotificationStream.tsx`)
   - Interface visual para notificações
   - Toast notifications
   - Indicadores de status
   - Notificações do browser

4. **Sistema de Templates** (`/src/lib/notifications.ts`)
   - Templates predefinidos para diferentes tipos
   - Funções utilitárias para envio
   - Categorização e severidade

## Recursos Implementados

### ✅ Conectividade
- **Server-Sent Events (SSE)**: Conexão unidirecional otimizada
- **Reconexão Automática**: Reestabelece conexão em caso de falha
- **Heartbeat**: Mantém conexões vivas (30s)
- **Indicador de Status**: Mostra estado da conexão em tempo real

### ✅ Segurança
- **Rate Limiting**: 10 conexões SSE por minuto por IP
- **Autenticação**: Obrigatória para estabelecer conexão
- **Validação de Dados**: Sanitização de conteúdo HTML
- **Session-based**: Isolamento por usuário

### ✅ Performance
- **Conexões por Usuário**: Múltiplas abas/dispositivos suportados
- **Limpeza Automática**: Remove conexões inativas
- **Limite de Buffer**: Máximo 100 notificações em memória
- **Gerenciamento de Memória**: Cleanup automático de recursos

### ✅ UX/UI
- **Toast Notifications**: Aparecem temporariamente no canto da tela
- **Notificações do Browser**: Integração com Notification API
- **Categorização Visual**: Cores e ícones por tipo
- **Auto-close**: Inteligente baseado na severidade

### ✅ Templates e Integração
- **Templates Predefinidos**: Transações, orçamentos, metas, sistema
- **Hook Personalizado**: Fácil integração em componentes React
- **API Flexível**: Envio programático de notificações
- **Sistema de Eventos**: Callbacks para conexão/desconexão

## Como Usar

### 1. Integração Básica

```tsx
import { useNotificationStream } from '@/hooks/use-notification-stream';

function MyComponent() {
  const { 
    isConnected, 
    notifications, 
    unreadCount 
  } = useNotificationStream({
    onNotification: (notification) => {
      console.log('Nova notificação:', notification);
    }
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <p>Não lidas: {unreadCount}</p>
    </div>
  );
}
```

### 2. Envio de Notificações

```typescript
import { sendRealtimeNotification } from '@/lib/notifications';

// Notificação personalizada
await sendRealtimeNotification('user@email.com', {
  title: 'Nova Transação',
  message: 'Compra realizada com sucesso',
  type: 'success',
  category: 'transaction'
});

// Usando templates
import { sendTemplatedNotification } from '@/lib/notifications';

await sendTemplatedNotification(
  'user@email.com',
  'transactionCreated',
  150.50,
  'Compra no supermercado'
);
```

### 3. Componente Completo

```tsx
import { NotificationStream } from '@/components/notifications/NotificationStream';

function App() {
  return (
    <div>
      <h1>Minha Aplicação</h1>
      <NotificationStream />
    </div>
  );
}
```

## APIs Disponíveis

### `GET /api/notifications/stream`
Estabelece conexão SSE para receber notificações em tempo real.

**Headers:**
- `Authorization`: Bearer token ou session
- `Accept`: text/event-stream

**Response:** Stream de eventos SSE

### `POST /api/notifications/test`
Envia notificação de teste (desenvolvimento).

**Body:**
```json
{
  "title": "Título da notificação",
  "message": "Conteúdo da mensagem",
  "type": "info|success|warning|error",
  "severity": "low|medium|high",
  "category": "system|transaction|alert|goal|budget"
}
```

### `POST /api/notifications/templates`
Envia notificação usando template predefinido.

**Body:**
```json
{
  "template": "transactionCreated",
  "amount": 150.50,
  "description": "Compra no supermercado"
}
```

## Templates Disponíveis

### Transações
- `transactionCreated`: Nova transação registrada
- `transactionLarge`: Transação de alto valor detectada

### Orçamentos
- `budgetExceeded`: Orçamento excedido
- `budgetWarning`: Alerta de orçamento (80%+)

### Metas
- `goalAchieved`: Meta atingida com sucesso
- `goalProgress`: Progresso da meta atualizado

### Sistema
- `systemMaintenance`: Manutenção programada
- `systemUpdate`: Sistema atualizado
- `loginDetected`: Novo login detectado
- `suspiciousActivity`: Atividade suspeita

## Configuração de Rate Limiting

```typescript
// SSE Connections
{
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minuto
  message: 'Muitas conexões SSE'
}

// Test Notifications
{
  maxRequests: 50,
  windowMs: 15 * 60 * 1000, // 15 minutos
  message: 'Limite de testes excedido'
}
```

## Monitoramento

### Métricas Importantes
- **Conexões Ativas**: Número de usuários conectados
- **Taxa de Reconexão**: Frequência de reconexões
- **Latência de Entrega**: Tempo até recebimento
- **Rate Limit Hits**: Tentativas bloqueadas

### Logs de Debug
```typescript
// Ativar logs detalhados
const { connect } = useNotificationStream({
  onConnect: () => console.log('SSE connected'),
  onDisconnect: () => console.log('SSE disconnected'),
  onError: (error) => console.error('SSE error:', error)
});
```

## Próximos Passos

### Melhorias Futuras
1. **Redis para Produção**: Substituir in-memory store
2. **WebSockets**: Para comunicação bidirecional
3. **Push Notifications**: Integração com service workers
4. **Analytics**: Métricas de engajamento
5. **A/B Testing**: Templates personalizados

### Integração com Sistema
- Chamar notificações em tempo real quando:
  - Transação é criada/atualizada
  - Orçamento é excedido
  - Meta é atingida
  - Sistema tem updates importantes

## Exemplo de Página de Demonstração

Acesse `/realtime-notifications` para ver o sistema funcionando com:
- Formulário de teste personalizado
- Templates predefinidos
- Visualização em tempo real
- Indicadores de status
- Lista completa de recursos

---

## Testes

Execute os testes com:
```bash
npm test tests/lib/notification-stream.test.ts
```

**Cobertura atual**: 15 testes passando
- Hooks e estado
- Templates de notificação  
- Gerenciamento de conexões SSE
- Rate limiting
- Validação de dados
- APIs de integração

---

*Sistema implementado com foco em performance, segurança e experiência do usuário.*