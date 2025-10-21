# 🛠️ Comandos Úteis para Manutenção

## 📋 Verificação de Status

### Verificar Logger
```bash
# Ver todos os imports do logger
grep -r \"import { logger }\" src/app/api --include=\"*.ts\"

# Contar quantos endpoints têm logger
grep -r \"import { logger }\" src/app/api --include=\"*.ts\" | wc -l
```

### Verificar Validação Zod
```bash
# Ver todos os schemas Zod
grep -r \"Schema = z.object\" src/app/api --include=\"*.ts\"

# Ver todos os validateSchemas
grep -r \"safeParse\\|parse(\" src/app/api --include=\"*.ts\" | grep -i schema
```

### Encontrar Try-Catch Vazios
```bash
# ⚠️ Avisar se houver mais catch {}
grep -r \"catch\\s*{\\s*}\" src/app/api --include=\"*.ts\"

# Se retornar nada, estamos ✅ OK
```

### Verificar Endpoints Sem Validação
```bash
# Listar todos os searchParams.get
grep -r \"searchParams.get\" src/app/api --include=\"*.ts\" | head -20

# Anotar para validar depois
```

---

## 🧪 Testes Locais

### Testar com Parâmetros Inválidos

#### Dashboard Cards - Mês inválido
```bash
curl \"http://localhost:3000/api/dashboard/cards?month=13\"
# Esperado: Erro de validação
```

#### Dashboard Cards - Ano inválido
```bash
curl \"http://localhost:3000/api/dashboard/cards?year=1999\"
# Esperado: Erro de validação (< 2000)
```

#### Incomes - Página inválida
```bash
curl \"http://localhost:3000/api/incomes?page=0\"
# Esperado: Erro de validação (página deve ser >= 1)
```

#### Incomes - PerPage muito grande
```bash
curl \"http://localhost:3000/api/incomes?perPage=500\"
# Esperado: Erro de validação (máx 200)
```

#### Credit Bills - Status inválido
```bash
curl \"http://localhost:3000/api/credit-bills?creditCardId=abc123&status=INVALIDO\"
# Esperado: Sem erro (string aceita), mas sem retorno
```

---

## 📊 Análise de Performance

### Tamanho do Logger
```bash
wc -l src/lib/logger.ts
# Esperado: ~130 linhas
```

### Verificar Imports
```bash
# Ver quantidade de imports por endpoint
for file in src/app/api/**/route.ts; do
  echo \"=== $file ===\"
  grep \"^import\" \"$file\" | wc -l
done
```

---

## 🔍 Logs em Ação

### Ver logs em desenvolvimento
```bash
# Terminal 1: Iniciar aplicação
npm run dev

# Terminal 2: Fazer requisição
curl \"http://localhost:3000/api/incomes?page=1&perPage=50\"

# Verificar console para logs:
# [2025-10-21T...] [INFO] API Request: GET /api/incomes
# [2025-10-21T...] [INFO] API Response: GET /api/incomes - 200
```

### Testar erro de validação
```bash
# Requisição com parâmetro inválido
curl \"http://localhost:3000/api/incomes?page=abc\"

# Verificar console para:
# [2025-10-21T...] [ERROR] Validação falhou em /api/incomes
```

---

## 🚀 Deployment Checklist

### Antes de fazer Deploy
```bash
# 1. Verificar build
npm run build

# 2. Verificar erros de tipo
npx tsc --noEmit

# 3. Verificar linting
npm run lint

# 4. Verificar testes
npm test

# 5. Verificar se há console.log/console.error
grep -r \"console\\.\" src/app/api --include=\"*.ts\" | grep -v logger

# Se retornar algo, revisar e trocar por logger
```

---

## 📝 Template para Novo Endpoint com Validação

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 1. Definir schema
const QuerySchema = z.object({
  param1: z.string().optional(),
  param2: z.string().regex(/^\\d+$/).transform(Number).pipe(z.number().int().min(1)),
});

export async function GET(req: NextRequest) {
  // 2. Autenticar
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/novo');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ 
    where: { email: session.user.email } 
  });
  if (!user) {
    logger.warn('Usuário não encontrado em /api/novo', { email: session.user.email });
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);

  // 3. Validar com Zod
  const queryParams = {
    param1: url.searchParams.get('param1'),
    param2: url.searchParams.get('param2'),
  };

  const validationResult = QuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError(
      'Validação falhou em /api/novo',
      validationResult.error.flatten().fieldErrors,
      { userId: user.id }
    );
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { param1, param2 } = validationResult.data;

  // 4. Logar requisição
  logger.apiRequest('GET', '/api/novo', user.email, { param1, param2 });

  try {
    // 5. Sua lógica aqui
    const result = await prisma.minhaTabela.findMany({
      where: { userId: user.id },
      take: param2,
    });

    // 6. Logar resposta
    logger.apiResponse('GET', '/api/novo', 200, 50, { count: result.length });

    return NextResponse.json(result);
  } catch (error) {
    // 7. Logar erro
    logger.error('Erro em /api/novo', error, { userId: user.id });
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
```

---

## 🔗 Links Rápidos

| Arquivo | Objetivo |
|---------|----------|
| `src/lib/logger.ts` | Implementação do logger |
| `MELHORIAS_IMPLEMENTADAS.md` | Detalhes das mudanças |
| `GUIA_VALIDACAO_LOGGING.md` | Como usar em novos endpoints |
| `SUMARIO_IMPLEMENTACOES.md` | Resumo executivo |

---

## 🐛 Troubleshooting

### Logger não aparece nos logs
```bash
# Verificar se está em development mode
echo $NODE_ENV

# Se não, rodar com development
NODE_ENV=development npm run dev
```

### Erro: Cannot find module 'logger'
```bash
# Verificar path do import
# ✅ Correto: import { logger } from '@/lib/logger';
# ✅ Correto: import { logger } from '../../../../lib/logger';

# ❌ Incorreto: import { logger } from './logger';
```

### Validação muito restritiva
```bash
# Relaxar validação se necessário
// De:
z.number().int().min(1).max(100)

// Para:
z.number().int().min(1).max(10000)
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte `GUIA_VALIDACAO_LOGGING.md`
2. Revise exemplos em endpoints existentes
3. Verifique logs em `src/lib/logger.ts`

---

**Última atualização:** 21 de outubro de 2025
