# 🤖 Assistente Financeiro de IA

## 📋 Visão Geral

O Assistente Financeiro de IA é um consultor virtual integrado ao sistema que fornece insights personalizados, sugestões de economia e análises financeiras através de uma interface de chat conversacional. **Funciona perfeitamente sem necessidade de LLM/OpenAI**, usando um sistema inteligente de análise de perguntas.

## ✨ Funcionalidades

### 🎯 Principais Recursos

1. **Chat Conversacional Inteligente**
   - Interface de chat flutuante e responsiva
   - Histórico de mensagens
   - Sugestões de perguntas rápidas
   - **Entende perguntas em linguagem natural**

2. **Análise de Perguntas Avançada**
   - Detecta automaticamente a intenção da pergunta
   - Identifica períodos (mês passado, este mês, mês específico)
   - Extrai categorias, carteiras e valores
   - Suporta perguntas complexas e específicas

3. **Consultas Disponíveis**
   
   **💰 Saldos e Carteiras:**
   - "Qual meu saldo total?"
   - "Quanto tenho na carteira X?"
   - "Mostre o saldo de todas as carteiras"
   
   **💸 Despesas:**
   - "Quanto gastei mês passado?"
   - "Quanto gastei em alimentação em outubro?"
   - "Quais minhas maiores despesas?"
   - "Quanto gastei este mês?"
   
   **💵 Receitas:**
   - "Quanto recebi este mês?"
   - "Qual minha renda em novembro?"
   - "Receitas de salário mês passado"
   
   **🎯 Metas:**
   - "Como estão minhas metas?"
   - "Estou perto de alcançar minhas metas?"
   
   **📊 Resumos:**
   - "Me dê um resumo financeiro"
   - "Qual minha situação este mês?"
   - "Resumo de outubro"
   
   **💡 Economia:**
   - "Como posso economizar?"
   - "Dicas para poupar"
   - "Onde posso cortar gastos?"

4. **Insights Inteligentes Automáticos**
   - Alertas sobre taxa de poupança baixa
   - Identificação de categorias com gastos altos
   - Sugestões de economia
   - Progresso em metas financeiras
   - Análise de despesas recorrentes

## 🚀 Como Usar

### Para Usuários

1. **Acessar o Assistente**
   - Clique no botão flutuante roxo/azul no canto inferior direito
   - O assistente está disponível em todas as páginas (após login)

2. **Fazer Perguntas em Linguagem Natural**
   O assistente entende perguntas como:
   
   **Exemplos de Saldo:**
   - "Qual meu saldo total?"
   - "Quanto tenho na Nubank?"
   - "Saldo das carteiras"
   
   **Exemplos de Gastos:**
   - "Quanto gastei em alimentação mês passado?"
   - "Gastos de outubro"
   - "Quanto gastei este mês?"
   - "Meus maiores gastos"
   
   **Exemplos de Receitas:**
   - "Quanto recebi este mês?"
   - "Receitas de novembro"
   - "Salário de outubro"
   
   **Exemplos de Metas:**
   - "Como estão minhas metas?"
   - "Progresso das metas"
   
   **Exemplos de Resumo:**
   - "Resumo financeiro"
   - "Minha situação em outubro"
   - "Como estou financeiramente?"
   
   **Exemplos de Economia:**
   - "Como posso economizar?"
   - "Dicas de economia"
   - "Onde cortar gastos?"

3. **Receber Respostas Detalhadas**
   - Valores específicos e exatos
   - Percentuais e análises
   - Insights coloridos abaixo do chat
   - Sugestões práticas e acionáveis

## 🧠 Sistema Inteligente sem LLM

O assistente usa um sistema avançado de **análise de intenção** que:

1. **Remove acentos** para melhor matching
2. **Detecta períodos automaticamente:**
   - "mês passado" → mês anterior
   - "este mês" → mês atual
   - "outubro" → outubro do ano atual
   - "novembro 2024" → mês e ano específico

3. **Identifica ações:**
   - Saldo, gastos, receitas, metas, resumo, economia

4. **Extrai entidades:**
   - Categorias: "alimentação", "transporte", etc.
   - Carteiras: "Nubank", "Carteira Principal", etc.
   - Cartões de crédito (em desenvolvimento)

5. **Fuzzy matching:**
   - Encontra correspondências mesmo com erros de digitação
   - "alimentaçao" → "Alimentação"
   - "carteira nu" → "Nubank"

## 🔧 Configuração Técnica

### Modo de Operação

O assistente funciona em **dois modos**:

#### 1. **Modo IA (OpenAI)**
Quando `OPENAI_API_KEY` está configurada:
- Usa GPT-3.5-turbo para respostas inteligentes
- Análises mais naturais e contextualizadas
- Respostas personalizadas para cada pergunta

#### 2. **Modo Baseado em Regras (Fallback)**
Quando OpenAI não está configurada:
- Sistema de análise por palavras-chave
- Respostas pré-definidas mas contextualizadas
- Totalmente funcional sem custos de API

### Configurar OpenAI (Opcional)

1. Obtenha uma chave da API em: https://platform.openai.com/api-keys

2. Adicione ao `.env.local`:
```env
OPENAI_API_KEY="sk-..."
```

3. Reinicie o servidor de desenvolvimento

**Nota:** O assistente funciona perfeitamente sem OpenAI usando o modo de regras!

## 📊 Contexto Financeiro Coletado

O assistente analisa automaticamente:

- ✅ **Receitas e Despesas** (últimos 3 meses)
- ✅ **Categorias Principais** (top 5 despesas, top 3 receitas)
- ✅ **Saldos de Carteiras**
- ✅ **Despesas Recorrentes**
- ✅ **Metas Financeiras** e progresso
- ✅ **Taxa de Poupança**
- ✅ **Transações Recentes** (últimas 10)

## 💡 Tipos de Insights

### 1. **Poupança (Savings)**
- 🟢 Alta: Taxa de poupança > 20%
- 🔴 Baixa: Taxa de poupança < 5%

### 2. **Gastos (Spending)**
- 🟡 Alerta quando categoria única > 30% do total

### 3. **Orçamento (Budget)**
- 🟡 Alerta sobre despesas recorrentes altas

### 4. **Metas (Goal)**
- 🟢 Notificação quando meta está próxima de completar (>80%)

### 5. **Dicas (Tip)**
- 🔵 Sugestões gerais e boas práticas financeiras

## 🎨 Interface

### Componentes

1. **AIAssistantButton** (`ai-assistant-button.tsx`)
   - Botão flutuante no canto inferior direito
   - Visível apenas para usuários autenticados
   - Ícone de "estrela mágica" (Sparkles)

2. **AIAssistantChat** (`ai-assistant-chat.tsx`)
   - Modal de chat completo
   - Área de mensagens com scroll
   - Cards de insights coloridos
   - Sugestões de perguntas
   - Input com envio por Enter

### Cores e Temas

- **Gradiente Principal:** Purple → Blue (#9333ea → #2563eb)
- **Mensagens do Usuário:** Gradiente roxo/azul
- **Mensagens do Assistente:** Cinza adaptativo (light/dark mode)
- **Insights:** Cores baseadas em prioridade e tipo

## 🔌 API

### Endpoint Principal

**POST** `/api/ai-assistant/chat`

**Request:**
```json
{
  "message": "Como posso economizar?",
  "includeContext": true
}
```

**Response:**
```json
{
  "message": "💡 Dicas para economizar...",
  "insights": [
    {
      "type": "savings",
      "priority": "high",
      "title": "Taxa de Poupança Baixa",
      "description": "Você está poupando apenas 5.2% da sua renda.",
      "suggestion": "Tente cortar 10% dos gastos...",
      "impact": {
        "percentage": 5.2
      }
    }
  ],
  "contextUsed": true,
  "suggestions": [
    "Quanto gastei este mês?",
    "Como estão minhas metas?"
  ]
}
```

## 📁 Arquivos Criados

```
src/
├── types/
│   └── ai-assistant.ts                      # Tipos TypeScript
├── lib/
│   └── ai-assistant-processor.ts            # Processador inteligente de perguntas
├── app/
│   └── api/
│       └── ai-assistant/
│           └── chat/
│               └── route.ts                  # API endpoint
└── components/
    └── ai-assistant/
        ├── ai-assistant-button.tsx          # Botão flutuante
        └── ai-assistant-chat.tsx            # Interface do chat
```

## 🎯 Exemplos Reais de Uso

### Consulta de Gastos Específicos

**Usuário:** "Quanto gastei em alimentação mês passado?"

**Assistente:** 
```
💰 Gastos com Alimentação em outubro/2025:

• Valor: R$ 1.234,56
• Percentual: 23.5% do total de despesas

⚠️ Esta categoria representa uma parte significativa dos seus gastos!
```

### Consulta de Saldo

**Usuário:** "Qual o saldo da Nubank?"

**Assistente:**
```
💰 Nubank: R$ 2.456,78
```

### Resumo Completo

**Usuário:** "Me dê um resumo financeiro"

**Assistente:**
```
📊 Resumo Financeiro (últimos 3 meses):

💵 Receitas: R$ 15.000,00
💸 Despesas: R$ 12.300,45
💰 Saldo: R$ 2.699,55
📈 Taxa de poupança: 18.0%

✅ Bom trabalho! Continue mantendo esse controle.

Maiores gastos:
1. Alimentação: R$ 3.450,00
2. Transporte: R$ 2.100,00
3. Moradia: R$ 4.200,00
```

## 🔒 Segurança

- ✅ Autenticação obrigatória via NextAuth
- ✅ Dados isolados por usuário
- ✅ Nenhum dado sensível exposto ao cliente
- ✅ Rate limiting aplicado via middleware existente
- ✅ Validação de entrada

## 🚀 Próximas Melhorias

### Sugestões de Expansão

1. **Histórico Persistente**
   - Salvar conversas no banco de dados
   - Retomar conversas anteriores

2. **Ações Diretas**
   - "Criar meta de economia de R$ 1000"
   - "Adicionar despesa de R$ 50 em Alimentação"

3. **Análises Avançadas**
   - Comparação mês a mês
   - Previsões baseadas em histórico
   - Benchmarks com médias

4. **Notificações Proativas**
   - Alertas automáticos quando padrões mudam
   - Lembretes de metas

5. **Gráficos Interativos**
   - Visualizações geradas pelo assistente
   - Gráficos inline no chat

6. **Comandos de Voz**
   - Input por voz
   - Respostas em áudio

## 🐛 Troubleshooting

### Botão não aparece
- Verifique se está logado
- Limpe cache do navegador

### Respostas lentas
- Verifique conexão com OpenAI
- Considere usar modo de regras (sem API key)

### Insights não aparecem
- Verifique se há transações no período (últimos 3 meses)
- Adicione mais categorias e transações

## 📝 Notas de Desenvolvimento

- **Performance:** Contexto é coletado a cada mensagem (pode ser otimizado com cache)
- **Custos:** OpenAI cobra por token (~$0.002/1K tokens no GPT-3.5)
- **Limites:** OpenAI tem rate limits por conta
- **Fallback:** Sistema funciona 100% sem OpenAI

## 📄 Licença

Este recurso faz parte do sistema de Controle Financeiro e segue a mesma licença do projeto principal.
