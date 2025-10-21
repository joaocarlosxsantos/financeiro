# 🔐 Guia de Boas Práticas - Validação e Logging

## Checklist para Novos Endpoints

Ao criar novos endpoints, siga este checklist:

### ✅ 1. Importar Dependências
```typescript
import { z } from 'zod';
import { logger } from '@/lib/logger';
```

### ✅ 2. Criar Schema Zod
```typescript
const QuerySchema = z.object({
  param1: z.string().optional(),
  param2: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)),
  param3: z.enum(['OPTION_A', 'OPTION_B']).optional(),
});
```

### ✅ 3. Validar Query Parameters
```typescript
const validationResult = QuerySchema.safeParse({
  param1: req.nextUrl.searchParams.get('param1'),
  param2: req.nextUrl.searchParams.get('param2'),
  param3: req.nextUrl.searchParams.get('param3'),
});

if (!validationResult.success) {
  logger.validationError('Validação falhou em /api/meu-endpoint', 
    validationResult.error.flatten().fieldErrors, 
    { userId: user.id }
  );
  return NextResponse.json(
    { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
    { status: 400 }
  );
}
```

### ✅ 4. Usar Dados Validados
```typescript
const { param1, param2, param3 } = validationResult.data;
```

### ✅ 5. Adicionar Logging
```typescript
// No início
logger.apiRequest('GET', '/api/meu-endpoint', user.email, { filters: { param1 } });

// Em caso de erro
logger.error('Erro ao processar requisição', error, { endpoint: '/api/meu-endpoint' });

// Ao finalizar
logger.apiResponse('GET', '/api/meu-endpoint', 200, duration, { count: results.length });
```

---

## 📝 Exemplos de Schemas Zod Comuns

### String Simples
```typescript
nome: z.string().min(1).max(100)
```

### Números
```typescript
idade: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(150))
```

### Datas
```typescript
data: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
```

### Enum
```typescript
tipo: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA']).optional()
```

### Boolean
```typescript
ativo: z.string().transform(v => v === 'true').optional()
```

### IDs (CSV ou Simples)
```typescript
ids: z.string() // Pode ser "id1,id2,id3" ou "id1"
```

---

## 🚨 Erros Comuns a Evitar

### ❌ Sem Validação
```typescript
// ❌ NÃO FAÇA ISSO
const page = Number(searchParams.get('page') || '1');
```

### ❌ Try-Catch Vazio
```typescript
// ❌ NÃO FAÇA ISSO
try {
  // ... código
} catch {}
```

### ❌ Console.log em Produção
```typescript
// ❌ NÃO FAÇA ISSO
console.log('Processando', data);
console.error('Erro:', error);
```

---

## ✅ Como Fazer

### ✅ Com Validação
```typescript
const QuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1))
});

const result = QuerySchema.safeParse({ page: searchParams.get('page') });
if (!result.success) {
  logger.validationError('Erro de validação', result.error.flatten().fieldErrors);
  return NextResponse.json({ error: 'Invalid' }, { status: 400 });
}
```

### ✅ Com Logging
```typescript
try {
  // ... operação
  logger.apiResponse('GET', '/api/endpoint', 200, duration);
} catch (error) {
  logger.error('Erro em /api/endpoint', error, { userId: user.id });
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

---

## 📊 Níveis de Log

| Nível | Uso | Exemplo |
|-------|-----|---------|
| `info` | Operações normais | Usuário criado, relatório gerado |
| `warn` | Situações anormais | Limite de taxa atingido, valor fora do range |
| `error` | Erros | Falha em acesso ao BD, erro de validação |
| `debug` | Desenvolvimento | Valores de variáveis, fluxo de execução |

---

## 🎯 Padrão de Resposta com Erro

```typescript
{
  "error": "Parâmetros inválidos",
  "details": {
    "year": ["Valor deve ser um número entre 2000 e 2100"],
    "month": ["Valor deve ser um número entre 1 e 12"]
  }
}
```

---

## 🔗 Referências

- **Logger**: `src/lib/logger.ts`
- **Exemplos**: Ver arquivos em `src/app/api/`
  - ✅ `dashboard/cards/route.ts` - Exemplo completo
  - ✅ `notifications/route.ts` - Com filtros
  - ✅ `incomes/route.ts` - Com datas
  - ✅ `credit-bills/route.ts` - Com paginação

---

**Última atualização:** 21 de outubro de 2025
