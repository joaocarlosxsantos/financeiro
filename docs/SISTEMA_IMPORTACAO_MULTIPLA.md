# Sistema de Importação de Extratos (Único e Múltiplo)

## Visão Geral
Sistema unificado para importação de um ou múltiplos arquivos de extrato bancário com processamento otimizado, sistema de notificações em tempo real e cálculo otimizado de metas.

## Funcionalidades Implementadas

### 1. Upload Unificado de Arquivos
- **Componente**: `ExtratoUpload` (modificado)
- **Localização**: `src/components/importar-extrato/extrato-upload.tsx`
- **Funcionalidades**:
  - Interface drag & drop para um ou múltiplos arquivos
  - Seleção múltipla através do atributo `multiple`
  - Visualização de lista de arquivos selecionados
  - Remoção individual de arquivos
  - Processamento paralelo (máximo 3 arquivos simultâneos)
  - Integração com sistema de notificações

### 2. Visualização Consolidada
- **Componente**: `MultipleExtratoPreview`
- **Localização**: `src/components/importar-extrato/multiple-extrato-preview.tsx`
- **Funcionalidades**:
  - Estatísticas consolidadas de todos os arquivos
  - Visualização em abas (individual + consolidado)
  - Seleção de carteira unificada
  - Salvamento em lote com processamento em segundo plano

### 3. Processamento em Segundo Plano
- **API Route**: `/api/importar-extrato/batch`
- **Localização**: `src/app/api/importar-extrato/batch/route.ts`
- **Funcionalidades**:
  - Processamento assíncrono para não travar a interface
  - Transações com rollback automático em caso de erro
  - Cache de categorias e tags para otimização
  - **Cálculo de metas diferido** até o final do processamento
  - Notificações de progresso

### 4. Sistema de Notificações
- **Hook**: `useImportNotifications`
- **Localização**: `src/hooks/use-import-notifications.ts`
- **Componente**: `ImportNotificationsPanel`
- **Localização**: `src/components/importar-extrato/import-notifications-panel.tsx`
- **Funcionalidades**:
  - Notificações em tempo real de progresso
  - Diferentes tipos: sucesso, erro, info, progresso
  - Auto-remoção de notificações antigas
  - Barra de progresso global com estatísticas
  - Histórico de operações

### 5. Interface Unificada
- **Página Principal**: `src/app/importar-extrato/page.tsx`
- **Funcionalidades**:
  - Interface única que detecta automaticamente se são um ou múltiplos arquivos
  - Integração completa com notificações
  - Lógica inteligente de processamento baseada na quantidade de arquivos

## Arquitetura da Solução

### Fluxo de Processamento

1. **Upload**: Usuário seleciona múltiplos arquivos
2. **Parsing**: Cada arquivo é processado individualmente para extrair transações
3. **Preview**: Visualização consolidada com estatísticas
4. **Salvamento**: Processamento em lote em segundo plano
5. **Notificações**: Feedback em tempo real do progresso
6. **Metas**: Cálculo apenas após todos os registros serem processados

### Otimizações Implementadas

#### Performance
- **Processamento Paralelo**: Até 3 arquivos simultâneos
- **Cache de Categorias**: Evita consultas repetitivas ao banco
- **Transações Otimizadas**: Bulk inserts e updates
- **Processamento Assíncrono**: Interface não trava durante importação

#### UX/UI
- **Feedback Visual**: Barras de progresso e status por arquivo
- **Notificações**: Sistema completo de notificações em tempo real
- **Interface Responsiva**: Funciona em desktop e mobile
- **Estados de Loading**: Indicadores visuais durante processamento

#### Confiabilidade
- **Tratamento de Erros**: Rollback automático em caso de falhas
- **Validação**: Verificação de arquivos e dados antes do processamento
- **Recuperação**: Sistema continua mesmo se alguns arquivos falharem

## Estrutura de Arquivos

```
src/
├── app/
│   ├── importar-extrato/
│   │   └── page.tsx                          # Página principal com abas
│   └── api/
│       └── importar-extrato/
│           └── batch/
│               └── route.ts                  # API de processamento em lote
├── components/
│   └── importar-extrato/
│       ├── multiple-extrato-upload.tsx       # Upload múltiplo
│       ├── multiple-extrato-preview.tsx      # Preview consolidado
│       ├── import-notifications-panel.tsx   # Painel de notificações
│       └── import-test-buttons.tsx          # Botões de teste (remover em produção)
└── hooks/
    └── use-import-notifications.ts           # Hook de notificações
```

## Como Usar

### Para Usuários
1. Acesse a página "Importar Extrato"
2. Arraste ou selecione um ou múltiplos arquivos OFX
3. Visualize a lista de arquivos selecionados (remova se necessário)
4. Clique em "Processar" ou "Processar X arquivos"
5. Aguarde o processamento (acompanhe pelas notificações)
6. Visualize as transações (individual ou consolidada automaticamente)
7. Selecione a carteira de destino
8. Clique em "Salvar Transações"
9. Acompanhe o progresso final pelas notificações

### Para Desenvolvedores
1. O sistema é modular e pode ser estendido
2. Notificações são centralizadas no hook `useImportNotifications`
3. API de lote pode ser reutilizada para outras operações
4. Componentes são tipados com TypeScript

## Configurações

### Limites de Processamento
- **Arquivos Simultâneos**: 3 (configurável no componente)
- **Timeout de Notificação**: 10 segundos para sucesso/info
- **Auto-limpeza**: Progresso resetado após 5 segundos da conclusão

### Performance
- **Cache**: Categorias e tags são carregadas uma vez por sessão
- **Batch Size**: Transações processadas em lotes otimizados
- **Memoria**: Upload usa streaming para arquivos grandes

## Próximos Passos (Sugestões)

1. **WebSocket Real**: Substituir simulação por WebSocket real
2. **Retry Logic**: Sistema de retry automático para falhas temporárias
3. **Histórico**: Persistir histórico de importações
4. **Backup**: Sistema de backup antes de grandes importações
5. **Validação Avançada**: Detecção de duplicatas entre arquivos
6. **Relatórios**: Relatório detalhado pós-importação

## Testes

### Componente de Teste
O arquivo `import-test-buttons.tsx` inclui botões para simular:
- Importação com progresso
- Notificações de erro
- Notificações informativas

**Importante**: Remover este componente em produção.

## Troubleshooting

### Problemas Comuns
1. **Arquivos não processam**: Verificar formato OFX válido
2. **Interface trava**: Verificar se processamento está em segundo plano
3. **Notificações não aparecem**: Verificar se hook está sendo usado corretamente
4. **Metas não atualizam**: Sistema espera conclusão de todos os arquivos (comportamento correto)

### Logs
- Processamento: Console do navegador e logs da API
- Notificações: Estado do hook `useImportNotifications`
- Erros: Capturados e exibidos nas notificações

## Conclusão

O sistema implementado atende aos requisitos solicitados:
- ✅ **Upload múltiplo**: Suporte a vários arquivos simultaneamente
- ✅ **Processamento não-bloqueante**: Interface responsiva durante importação
- ✅ **Metas diferidas**: Cálculos só após processamento completo
- ✅ **Feedback visual**: Sistema completo de notificações
- ✅ **Performance otimizada**: Cache, transações em lote, processamento paralelo