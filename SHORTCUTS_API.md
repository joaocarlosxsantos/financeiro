# 📚 Documentação das APIs Shortcuts

## 🔐 Autenticação

Todos os endpoints suportam **2 métodos de autenticação**:

### 1. API Key (Recomendado para integrações externas)
```http
Authorization: Bearer YOUR_API_KEY
```

### 2. NextAuth Session (Para uso interno do app)
Autenticação automática via sessão do Next.js

---

## 📋 Índice de Endpoints

1. [Despesas (Expenses)](#1-despesas-expenses)
2. [Rendas (Incomes)](#2-rendas-incomes)
3. [Gastos de Cartão (Credit Expenses)](#3-gastos-de-cartão-credit-expenses)
4. [Transferências (Transfers)](#4-transferências-transfers)
5. [Cartões de Crédito (Credit Cards)](#5-cartões-de-crédito-credit-cards)
6. [Saldos (Balances)](#6-saldos-balances)
7. [Saldo Individual (Balance by ID)](#7-saldo-individual-balance-by-id)
8. [Atributos (Attributes)](#8-atributos-attributes)
9. [Metas (Goals)](#9-metas-goals)

---

## 1. Despesas (Expenses)

**Base URL:** `/api/shortcuts/expenses`

### **POST** - Criar Despesa

```http
POST /api/shortcuts/expenses
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Body:**
```json
{
  "description": "Compra no Mercado",
  "amount": 250.50,
  "date": "2024-01-15",
  "type": "PUNCTUAL",
  "isRecurring": false,
  "categoryId": "clxxx...",
  "walletId": "clxxx...",
  "tags": ["mercado", "alimentação"]
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `description` | string | ✅ | Descrição da despesa |
| `amount` | number | ✅ | Valor (positivo) |
| `date` | string | ❌ | Data (YYYY-MM-DD, DD/MM/YYYY ou ISO). Padrão: hoje |
| `type` | enum | ✅ | `RECURRING` ou `PUNCTUAL` |
| `isRecurring` | boolean | ❌ | Se é recorrente. Padrão: false |
| `startDate` | string | ❌ | Data início (para recorrentes) |
| `endDate` | string | ❌ | Data fim (para recorrentes) |
| `dayOfMonth` | number | ❌ | Dia do mês (para recorrentes) |
| `categoryId` | string | ❌ | ID da categoria |
| `walletId` | string | ❌ | ID da carteira |
| `tags` | array | ❌ | Array de tags |

**Normalização Automática:**
- `categoryId`: Aceita `null`, `''`, ou objeto com `{id}`, `{name}`, `{placeholder: true}`
- `tags`: Aceita array de strings ou objetos, remove `'no-tag'`

**Resposta Sucesso (201):**
```json
{
  "id": "clxxx...",
  "description": "Compra no Mercado",
  "amount": 250.50,
  "date": "2024-01-15T00:00:00.000Z",
  "type": "PUNCTUAL",
  "isRecurring": false,
  "categoryId": "clxxx...",
  "walletId": "clxxx...",
  "userId": "clxxx...",
  "tags": ["mercado", "alimentação"],
  "category": {
    "id": "clxxx...",
    "name": "Alimentação",
    "color": "#10B981",
    "icon": "🍔"
  },
  "wallet": {
    "id": "clxxx...",
    "name": "Conta Corrente",
    "type": "CHECKING",
    "color": "#3B82F6"
  },
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 2. Rendas (Incomes)

**Base URL:** `/api/shortcuts/incomes`

### **POST** - Criar Renda

```http
POST /api/shortcuts/incomes
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Body:**
```json
{
  "description": "Salário",
  "amount": 5000.00,
  "date": "2024-01-05",
  "type": "RECURRING",
  "isRecurring": true,
  "dayOfMonth": 5,
  "categoryId": "clxxx...",
  "walletId": "clxxx...",
  "tags": ["salário", "fixo"]
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `description` | string | ✅ | Descrição da renda |
| `amount` | number | ✅ | Valor (positivo) |
| `date` | string | ❌ | Data (YYYY-MM-DD, DD/MM/YYYY ou ISO). Padrão: hoje |
| `type` | enum | ✅ | `RECURRING` ou `PUNCTUAL` |
| `isRecurring` | boolean | ❌ | Se é recorrente. Padrão: false |
| `startDate` | string | ❌ | Data início (para recorrentes) |
| `endDate` | string | ❌ | Data fim (para recorrentes) |
| `dayOfMonth` | number | ❌ | Dia do mês (para recorrentes) |
| `categoryId` | string | ❌ | ID da categoria |
| `walletId` | string | ❌ | ID da carteira |
| `tags` | array | ❌ | Array de tags |

**Normalização Automática:**
- `categoryId`: Aceita `null`, `''`, ou objeto com `{id}`, `{name}`, `{placeholder: true}`
- `tags`: Aceita array de strings ou objetos, remove `'no-tag'`

**Resposta Sucesso (201):**
```json
{
  "id": "clxxx...",
  "description": "Salário",
  "amount": 5000.00,
  "date": "2024-01-05T00:00:00.000Z",
  "type": "RECURRING",
  "isRecurring": true,
  "dayOfMonth": 5,
  "categoryId": "clxxx...",
  "walletId": "clxxx...",
  "userId": "clxxx...",
  "tags": ["salário", "fixo"],
  "category": {
    "id": "clxxx...",
    "name": "Salário",
    "color": "#10B981",
    "icon": "💰"
  },
  "wallet": {
    "id": "clxxx...",
    "name": "Conta Corrente",
    "type": "CHECKING",
    "color": "#3B82F6"
  },
  "createdAt": "2024-01-05T10:30:00.000Z"
}
```

---

## 3. Gastos de Cartão (Credit Expenses)

**Base URL:** `/api/shortcuts/credit-expenses`

### **GET** - Listar Gastos de Cartão

```http
GET /api/shortcuts/credit-expenses?page=1&perPage=50&creditCardId=xxx&start=2024-01-01&end=2024-12-31&type=EXPENSE
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | ❌ | Número da página. Padrão: 1 |
| `perPage` | number | ❌ | Itens por página (máx: 200). Padrão: 50 |
| `creditCardId` | string | ❌ | Filtrar por cartão específico |
| `start` | string | ❌ | Data início (YYYY-MM-DD, DD/MM/YYYY, ISO) |
| `end` | string | ❌ | Data fim (YYYY-MM-DD, DD/MM/YYYY, ISO) |
| `type` | enum | ❌ | `EXPENSE` ou `REFUND` |

**Resposta Sucesso (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "description": "Compra Mercado",
      "amount": 300.00,
      "purchaseDate": "2024-01-15T00:00:00.000Z",
      "installments": 3,
      "type": "EXPENSE",
      "categoryId": "clxxx...",
      "category": {
        "id": "clxxx...",
        "name": "Alimentação",
        "color": "#10B981",
        "icon": "🍔"
      },
      "creditCardId": "clxxx...",
      "creditCard": {
        "id": "clxxx...",
        "name": "Nubank",
        "limit": 5000,
        "bank": {
          "name": "Nubank",
          "color": "#8A05BE"
        }
      },
      "billItems": [
        {
          "id": "clxxx...",
          "amount": 100.00,
          "installmentNumber": 1,
          "bill": {
            "id": "clxxx...",
            "dueDate": "2024-02-10T00:00:00.000Z",
            "status": "PAID"
          }
        }
      ],
      "tags": ["mercado", "essencial"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 125,
    "totalPages": 3
  }
}
```

---

### **POST** - Criar Gasto de Cartão

```http
POST /api/shortcuts/credit-expenses
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Body:**
```json
{
  "description": "Compra Mercado",
  "amount": 300.00,
  "purchaseDate": "2024-01-15",
  "creditCardId": "clxxx...",
  "installments": 3,
  "type": "EXPENSE",
  "categoryId": "clxxx...",
  "tags": ["mercado", "essencial"]
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `description` | string | ✅ | Descrição do gasto |
| `amount` | number | ✅ | Valor total (positivo) |
| `purchaseDate` | string | ✅ | Data da compra (YYYY-MM-DD, DD/MM/YYYY, ISO) |
| `creditCardId` | string | ✅ | ID do cartão de crédito |
| `installments` | number | ❌ | Número de parcelas (1-12). Padrão: 1 |
| `type` | enum | ❌ | `EXPENSE` ou `REFUND`. Padrão: EXPENSE |
| `categoryId` | string | ❌ | ID da categoria |
| `tags` | array | ❌ | Array de tags |

**Funcionalidades Automáticas:**
- ✅ Calcula automaticamente as datas das parcelas
- ✅ Cria as faturas (bills) automaticamente
- ✅ Vincula os itens às faturas (billItems)
- ✅ Suporta parcelamento de 1x a 12x

**Resposta Sucesso (201):**
```json
{
  "id": "clxxx...",
  "description": "Compra Mercado",
  "amount": 300.00,
  "purchaseDate": "2024-01-15T00:00:00.000Z",
  "installments": 3,
  "type": "EXPENSE",
  "categoryId": "clxxx...",
  "creditCardId": "clxxx...",
  "userId": "clxxx...",
  "tags": ["mercado", "essencial"],
  "billItems": [
    {
      "id": "clxxx...",
      "creditExpenseId": "clxxx...",
      "billId": "clxxx...",
      "amount": 100.00,
      "installmentNumber": 1
    },
    {
      "id": "clxxx...",
      "creditExpenseId": "clxxx...",
      "billId": "clxxx...",
      "amount": 100.00,
      "installmentNumber": 2
    },
    {
      "id": "clxxx...",
      "creditExpenseId": "clxxx...",
      "billId": "clxxx...",
      "amount": 100.00,
      "installmentNumber": 3
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 4. Transferências (Transfers)

**Base URL:** `/api/shortcuts/transfers`

### **GET** - Listar Transferências

```http
GET /api/shortcuts/transfers?page=1&perPage=50&start=2024-01-01&end=2024-12-31
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `page` | number | ❌ | Número da página. Padrão: 1 |
| `perPage` | number | ❌ | Itens por página (máx: 200). Padrão: 50 |
| `start` | string | ❌ | Data início (YYYY-MM-DD, DD/MM/YYYY, ISO) |
| `end` | string | ❌ | Data fim (YYYY-MM-DD, DD/MM/YYYY, ISO) |

**Resposta Sucesso (200):**
```json
{
  "transfers": [
    {
      "transferId": "transfer-1234567890-abc123",
      "date": "2024-01-15T00:00:00.000Z",
      "amount": 500.00,
      "description": "Transferência para poupança",
      "fromWallet": {
        "id": "clxxx...",
        "name": "Conta Corrente",
        "color": "#3B82F6"
      },
      "toWallet": {
        "id": "clxxx...",
        "name": "Poupança",
        "color": "#10B981"
      },
      "expense": {
        "id": "clxxx...",
        "amount": 500.00,
        "description": "Transferência para poupança",
        "date": "2024-01-15T00:00:00.000Z",
        "walletId": "clxxx...",
        "categoryId": "clxxx...",
        "category": {
          "id": "clxxx...",
          "name": "Transferência entre Contas",
          "color": "#6B7280",
          "icon": "🔄"
        }
      },
      "income": {
        "id": "clxxx...",
        "amount": 500.00,
        "description": "Transferência para poupança",
        "date": "2024-01-15T00:00:00.000Z",
        "walletId": "clxxx...",
        "categoryId": "clxxx...",
        "category": {
          "id": "clxxx...",
          "name": "Transferência entre Contas",
          "color": "#6B7280",
          "icon": "🔄"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 45,
    "totalPages": 1
  }
}
```

---

### **POST** - Criar Transferência

```http
POST /api/shortcuts/transfers
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Body:**
```json
{
  "amount": 500.00,
  "description": "Transferência para poupança",
  "fromWalletId": "clxxx...",
  "toWalletId": "clxxx...",
  "date": "2024-01-15"
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `amount` | number | ✅ | Valor da transferência (positivo) |
| `description` | string | ✅ | Descrição da transferência |
| `fromWalletId` | string | ✅ | ID da carteira de origem (saída) |
| `toWalletId` | string | ✅ | ID da carteira de destino (entrada) |
| `date` | string | ✅ | Data (YYYY-MM-DD, DD/MM/YYYY, ISO) |

**Validações:**
- ✅ As carteiras devem ser diferentes
- ✅ Ambas as carteiras devem pertencer ao usuário autenticado
- ✅ Cria automaticamente categoria "Transferência entre Contas" se não existir

**Funcionalidades Automáticas:**
- ✅ Cria uma despesa (saída) na carteira de origem
- ✅ Cria uma receita (entrada) na carteira de destino
- ✅ Vincula ambas com um `transferId` único
- ✅ Usa transação atômica (tudo ou nada)

**Resposta Sucesso (201):**
```json
{
  "transferId": "transfer-1234567890-abc123",
  "expense": {
    "id": "clxxx...",
    "description": "Transferência para poupança",
    "amount": 500.00,
    "date": "2024-01-15T00:00:00.000Z",
    "walletId": "clxxx...",
    "categoryId": "clxxx...",
    "userId": "clxxx...",
    "transferId": "transfer-1234567890-abc123",
    "tags": []
  },
  "income": {
    "id": "clxxx...",
    "description": "Transferência para poupança",
    "amount": 500.00,
    "date": "2024-01-15T00:00:00.000Z",
    "walletId": "clxxx...",
    "categoryId": "clxxx...",
    "userId": "clxxx...",
    "transferId": "transfer-1234567890-abc123",
    "tags": []
  }
}
```

---

## 5. Cartões de Crédito (Credit Cards)

**Base URL:** `/api/shortcuts/credit-cards`

### **GET** - Listar Cartões com Uso

```http
GET /api/shortcuts/credit-cards
Authorization: Bearer YOUR_API_KEY
```

**Resposta Sucesso (200):**
```json
{
  "creditCards": [
    {
      "id": "clxxx...",
      "name": "Nubank",
      "bank": "Nubank",
      "limit": 5000.00,
      "limitFormatted": "R$ 5.000,00",
      "usedAmount": 3250.50,
      "usedAmountFormatted": "R$ 3.250,50",
      "availableLimit": 1749.50,
      "availableLimitFormatted": "R$ 1.749,50",
      "usagePercentage": 65.01,
      "closingDay": 10,
      "dueDay": 17
    },
    {
      "id": "clxxx...",
      "name": "Inter",
      "bank": "Banco Inter",
      "limit": 3000.00,
      "limitFormatted": "R$ 3.000,00",
      "usedAmount": 1200.00,
      "usedAmountFormatted": "R$ 1.200,00",
      "availableLimit": 1800.00,
      "availableLimitFormatted": "R$ 1.800,00",
      "usagePercentage": 40.00,
      "closingDay": 5,
      "dueDay": 15
    }
  ]
}
```

**Funcionalidades:**
- ✅ Expande automaticamente gastos/ganhos recorrentes
- ✅ Calcula limite usado: `Gastos - Ganhos (cashback/estornos)`
- ✅ Calcula limite disponível: `Limite total - Usado`
- ✅ Calcula porcentagem de uso
- ✅ Filtra cartões sem uso (usedAmount = 0)
- ✅ Ordena por porcentagem de uso (maior primeiro)

---

## 6. Saldos (Balances)

**Base URL:** `/api/shortcuts/balances`

### **GET** - Listar Saldos de Todas as Carteiras

```http
GET /api/shortcuts/balances
Authorization: Bearer YOUR_API_KEY
```

**Resposta Sucesso (200):**
```json
{
  "wallets": [
    {
      "id": "clxxx...",
      "name": "Conta Corrente",
      "type": "CHECKING",
      "balance": 2500.50,
      "balanceFormatted": "R$ 2.500,50"
    },
    {
      "id": "clxxx...",
      "name": "Poupança",
      "type": "SAVINGS",
      "balance": 10000.00,
      "balanceFormatted": "R$ 10.000,00"
    },
    {
      "id": "clxxx...",
      "name": "Dinheiro",
      "type": "CASH",
      "balance": -150.00,
      "balanceFormatted": "-R$ 150,00"
    }
  ]
}
```

**Funcionalidades:**
- ✅ Expande automaticamente rendas/despesas recorrentes
- ✅ Calcula saldo: `Total Rendas - Total Despesas`
- ✅ Filtra carteiras com saldo zerado (balance = 0)
- ✅ Ordena por saldo (menor primeiro)
- ✅ Formata valores em reais (BRL)

---

## 7. Saldo Individual (Balance by ID)

**Base URL:** `/api/shortcuts/balances/[id]`

### **GET** - Obter Saldo de Uma Carteira

```http
GET /api/shortcuts/balances/clxxx...
Authorization: Bearer YOUR_API_KEY
```

**Resposta Sucesso (200):**
```json
{
  "id": "clxxx...",
  "name": "Conta Corrente",
  "type": "CHECKING",
  "balance": 2500.50,
  "balanceFormatted": "R$ 2.500,50"
}
```

**Erro 404:**
```json
{
  "error": "Carteira não encontrada"
}
```

**Funcionalidades:**
- ✅ Busca carteira específica por ID
- ✅ Verifica se pertence ao usuário autenticado
- ✅ Expande transações recorrentes
- ✅ Calcula saldo atualizado

---

## 8. Atributos (Attributes)

**Base URL:** `/api/shortcuts/attributes`

### **GET** - Obter Categorias, Carteiras e Tags

```http
GET /api/shortcuts/attributes?type=gasto
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `type` | string | ❌ | `gasto` ou `ganho` (filtra categorias) |

**Resposta Sucesso (200):**
```json
{
  "categories": [
    {
      "id": "no-category",
      "name": "Sem categoria"
    },
    {
      "id": "clxxx...",
      "name": "Alimentação"
    },
    {
      "id": "clxxx...",
      "name": "Transporte"
    }
  ],
  "wallets": [
    {
      "id": "clxxx...",
      "name": "Conta Corrente"
    },
    {
      "id": "clxxx...",
      "name": "Poupança"
    }
  ],
  "tags": [
    {
      "id": "no-tag",
      "name": "Sem tag"
    },
    {
      "id": "clxxx...",
      "name": "essencial"
    },
    {
      "id": "clxxx...",
      "name": "lazer"
    }
  ]
}
```

**Funcionalidades:**
- ✅ Retorna apenas `id` e `name`
- ✅ Inclui placeholders: `no-category` e `no-tag`
- ✅ Filtra categorias por tipo (EXPENSE, INCOME, BOTH)
- ✅ Ordenado por nome (alfabético)

**Filtros de Tipo:**
- `type=gasto`: Retorna categorias com `type: EXPENSE` ou `BOTH`
- `type=ganho`: Retorna categorias com `type: INCOME` ou `BOTH`
- Sem `type`: Retorna todas as categorias

---

## 9. Metas (Goals)

**Base URL:** `/api/shortcuts/goals`

### **GET** - Listar Metas com Progresso

```http
GET /api/shortcuts/goals?month=2024-01&type=RECURRING&appliesTo=EXPENSES
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `month` | string | ❌ | Mês no formato YYYY-MM (para metas recorrentes) |
| `type` | enum | ❌ | `TIMED` ou `RECURRING` |
| `appliesTo` | enum | ❌ | `EXPENSES`, `INCOMES` ou `BOTH` |

**Resposta Sucesso (200):**
```json
{
  "goals": [
    {
      "id": "clxxx...",
      "title": "Limite de Alimentação",
      "description": "Não gastar mais de R$ 1.000 com alimentação",
      "amount": 1000.00,
      "currentAmount": 750.50,
      "progress": 75.05,
      "isCompleted": false,
      "type": "RECURRING",
      "kind": "LIMIT",
      "operator": "LESS_THAN",
      "appliesTo": "EXPENSES",
      "startDate": null,
      "endDate": null,
      "recurrence": "MONTHLY",
      "active": true,
      "category": {
        "id": "clxxx...",
        "name": "Alimentação"
      },
      "walletId": null,
      "tagName": null,
      "tagFilters": [],
      "categoryIds": ["clxxx..."],
      "tagAggregates": [],
      "tagNames": [],
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-15T15:30:00.000Z"
    },
    {
      "id": "clxxx...",
      "title": "Economizar para Viagem",
      "description": "Juntar R$ 5.000 para viagem",
      "amount": 5000.00,
      "currentAmount": 3200.00,
      "progress": 64.00,
      "isCompleted": false,
      "type": "TIMED",
      "kind": "GOAL",
      "operator": "GREATER_THAN",
      "appliesTo": "INCOMES",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.999Z",
      "recurrence": null,
      "active": true,
      "category": null,
      "walletId": "clxxx...",
      "tagName": null,
      "tagFilters": ["poupança"],
      "categoryIds": [],
      "tagAggregates": [],
      "tagNames": [],
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-15T15:30:00.000Z"
    }
  ],
  "total": 2,
  "filters": {
    "month": "2024-01",
    "type": "RECURRING",
    "appliesTo": "EXPENSES"
  }
}
```

**Funcionalidades:**
- ✅ Calcula automaticamente o `currentAmount` baseado nas transações
- ✅ Calcula o `progress` (porcentagem de conclusão)
- ✅ Define `isCompleted` (se atingiu a meta)
- ✅ Suporta múltiplas categorias (`categoryIds`)
- ✅ Suporta múltiplas tags (`tagFilters`)
- ✅ Metas `TIMED`: usa `startDate` e `endDate`
- ✅ Metas `RECURRING`: usa parâmetro `month` para calcular período

**Tipos de Meta:**
- `TIMED`: Meta com prazo definido (startDate → endDate)
- `RECURRING`: Meta mensal/recorrente

**Tipo de Aplicação:**
- `EXPENSES`: Considera apenas despesas
- `INCOMES`: Considera apenas rendas
- `BOTH`: Considera ambos

**Kind de Meta:**
- `LIMIT`: Limite máximo (operador: LESS_THAN)
- `GOAL`: Objetivo mínimo (operador: GREATER_THAN)

---

## ⚠️ Códigos de Erro

### **401 - Não Autenticado**
```json
{
  "error": "Não autenticado"
}
```
**Causa:** API Key inválida ou sessão expirada

---

### **400 - Dados Inválidos**
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "message": "Descrição é obrigatória",
      "path": ["description"]
    }
  ]
}
```
**Causa:** Body ou query params inválidos (validação Zod)

---

### **404 - Não Encontrado**
```json
{
  "error": "Cartão de crédito não encontrado"
}
```
**Causa:** Recurso (cartão, carteira, categoria) não existe ou não pertence ao usuário

---

### **500 - Erro Interno**
```json
{
  "error": "Internal error"
}
```
**Causa:** Erro no servidor (banco de dados, exceções não tratadas)

---

## 🎯 Recursos Globais

### ✅ Parse Flexível de Datas
Todos os endpoints aceitam datas em **3 formatos**:
- `YYYY-MM-DD` → `2024-01-15`
- `DD/MM/YYYY` → `15/01/2024`
- ISO 8601 → `2024-01-15T10:30:00.000Z`

### ✅ Normalização de Inputs
- **categoryId**: Aceita `null`, `''`, `{id}`, `{name}`, `{placeholder: true}`
- **tags**: Aceita arrays de strings ou objetos, remove `'no-tag'`

### ✅ Paginação
- Limite de segurança: máximo **200 itens por página**
- Padrão: **50 itens por página**
- Retorno inclui: `page`, `perPage`, `total`, `totalPages`

### ✅ Expansão de Recorrentes
- Endpoints de saldo e cartões expandem automaticamente transações recorrentes
- Usa `isRecurring`, `startDate`, `endDate`, `dayOfMonth`

### ✅ Transações Atômicas
- Transferências usam `$transaction` (tudo ou nada)
- Gastos de cartão criam faturas atomicamente

### ✅ Formatação de Moeda
- Valores retornados como `number` E formatados como `string` (BRL)
- Exemplo: `balance: 2500.50` e `balanceFormatted: "R$ 2.500,50"`

---

## 📝 Exemplos de Uso

### Criar Despesa Recorrente
```bash
curl -X POST https://seu-dominio.com/api/shortcuts/expenses \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Netflix",
    "amount": 39.90,
    "type": "RECURRING",
    "isRecurring": true,
    "dayOfMonth": 15,
    "categoryId": "clxxx...",
    "walletId": "clxxx...",
    "tags": ["streaming", "fixo"]
  }'
```

### Criar Gasto de Cartão Parcelado
```bash
curl -X POST https://seu-dominio.com/api/shortcuts/credit-expenses \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Notebook",
    "amount": 3600.00,
    "purchaseDate": "2024-01-15",
    "creditCardId": "clxxx...",
    "installments": 12,
    "categoryId": "clxxx...",
    "tags": ["eletrônicos", "trabalho"]
  }'
```

### Criar Transferência
```bash
curl -X POST https://seu-dominio.com/api/shortcuts/transfers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "description": "Transferência para investimentos",
    "fromWalletId": "clxxx...",
    "toWalletId": "clxxx...",
    "date": "2024-01-15"
  }'
```

### Listar Saldos
```bash
curl https://seu-dominio.com/api/shortcuts/balances \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Obter Atributos para Formulário
```bash
curl https://seu-dominio.com/api/shortcuts/attributes?type=gasto \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🔒 Segurança

### API Keys
- Geradas pelo sistema (ver `/scripts/generate-apikeys.js`)
- Armazenadas criptografadas no banco
- Verificadas via `getUserByApiKeyFromHeader()`

### Isolamento de Dados
- Todas as queries incluem `userId` no `where`
- Impossível acessar dados de outros usuários
- Validação dupla: autenticação + ownership

### Rate Limiting
- Implementado via middleware (ver `/lib/rateLimiter.ts`)
- Limite por IP e por API Key

---

## 📊 Tipos TypeScript

```typescript
// Expense/Income
type TransactionType = 'RECURRING' | 'PUNCTUAL';

// Credit Expense
type CreditExpenseType = 'EXPENSE' | 'REFUND';

// Wallet
type WalletType = 'CHECKING' | 'SAVINGS' | 'CASH' | 'INVESTMENT';

// Category
type CategoryType = 'EXPENSE' | 'INCOME' | 'BOTH';

// Goal
type GoalType = 'TIMED' | 'RECURRING';
type GoalKind = 'LIMIT' | 'GOAL';
type GoalOperator = 'LESS_THAN' | 'GREATER_THAN';
type GoalAppliesTo = 'EXPENSES' | 'INCOMES' | 'BOTH';
type GoalRecurrence = 'MONTHLY' | 'YEARLY';

// Bill Status
type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE';
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Confira a autenticação (API Key válida)
3. Valide o formato do body/query params
4. Consulte esta documentação

**Data de Atualização:** 03/11/2025
**Versão da API:** 1.0
