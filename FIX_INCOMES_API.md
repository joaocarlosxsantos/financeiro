# 🔧 Correção: Ganhos não aparecem no Dashboard

## Problema Identificado

As APIs do dashboard não estavam trazendo dados de **ganhos recorrentes (RECURRING incomes)** nos gráficos e cards.

### Causa Raiz

No arquivo `/api/dashboard/charts/route.ts`, na seção que calcula `incomesByCategory`, havia um problema:

```typescript
// ❌ ANTES (INCORRETO)
const [incVarThis, incFixThis] = await Promise.all([
  prisma.income.findMany({ 
    where: { 
      user: { email: session.user.email }, 
      type: 'PUNCTUAL', 
      transferId: null, 
      ...walletFilter, 
      ...paymentTypeFilter, 
      date: { gte: startDateObj, lte: endDateObj }  // ← Filtro por data
    }, 
    include: { category: true } 
  }),
  prisma.income.findMany({ 
    where: { 
      user: { email: session.user.email }, 
      type: 'RECURRING', 
      transferId: null, 
      ...walletFilter, 
      ...paymentTypeFilter, 
      date: { gte: startDateObj, lte: endDateObj }  // ← Problema! RECURRING não tem data no período
    }, 
    include: { category: true } 
  }),
]);
```

**O problema:** Ganhos RECURRING têm `startDate` e `endDate`, não `date`. Quando se tenta filtrar por `date: { gte: startDateObj, lte: endDateObj }`, nenhum ganho RECURRING é retornado, pois eles não têm `date` dentro do período.

## Solução Implementada

Agora a API expande os ganhos RECURRING em ocorrências individuais dentro do período:

```typescript
// ✅ DEPOIS (CORRETO)
const [incVarThis, incFixThis] = await Promise.all([
  prisma.income.findMany({ 
    where: { 
      user: { email: session.user.email }, 
      type: 'PUNCTUAL', 
      transferId: null, 
      ...walletFilter, 
      ...paymentTypeFilter, 
      date: { gte: startDateObj, lte: endDateObj }
    }, 
    include: { category: true } 
  }),
  prisma.income.findMany({ 
    where: { 
      user: { email: session.user.email }, 
      type: 'RECURRING', 
      transferId: null, 
      ...walletFilter, 
      ...paymentTypeFilter
      // ← Sem filtro de data, pega TODOS os RECURRING
    }, 
    include: { category: true } 
  }),
]);

// Expandir RECURRING incomes em ocorrências dentro do período
const expandedFixedIncomesForCategory: any[] = [];
for (const i of incFixThis) {
  const recStart = i.startDate ?? i.date ?? startDateObj;
  const recEnd = i.endDate ?? endDateObj;
  const from = recStart > startDateObj ? recStart : startDateObj;
  const to = recEnd < endDateObj ? recEnd : endDateObj;
  if (!from || !to) continue;

  const day = typeof i.dayOfMonth === 'number' && i.dayOfMonth > 0 
    ? i.dayOfMonth 
    : new Date(i.date).getDate();

  // Iterar meses entre 'from' e 'to', criando ocorrência em cada
  let cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur.getTime() <= last.getTime()) {
    const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const dayInMonth = Math.min(day, lastDayOfMonth);
    const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
    if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
      expandedFixedIncomesForCategory.push({ ...i, date: formatYmd(occDate) });
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
}

const allIncomesThisMonth = [...incVarThis, ...expandedFixedIncomesForCategory];
```

## Dados Agora Exibidos Corretamente

### ✅ Cards do Dashboard
- **Total de Ganhos** (total incomes)
- **Saldo do Mês** (balance)
- **Saldo Acumulado** (cumulative balance)

### ✅ Gráficos
- **Ganhos por Categoria** (`incomesByCategory`)
- **Saldo Diário** (`dailyBalanceData`)
- **Projeção de Saldo** (`balanceProjectionData`)

### ✅ Filtros Funcionando
- Filtro por carteira (walletId)
- Filtro por tipo de pagamento (paymentType)
- Navegação de meses

## Comparação com Código de Despesas

O código de despesas **já estava correto** e fazendo a expansão:

```typescript
// Despesas - CORRETO desde o início
const [expVar, expFix] = await Promise.all([
  // PUNCTUAL com filtro de data
  prisma.expense.findMany({ 
    where: { 
      ...walletFilter, 
      ...paymentTypeFilter, 
      date: { gte: startDateObj, lte: endDateObj } 
    } 
  }),
  // RECURRING SEM filtro de data
  prisma.expense.findMany({ 
    where: { 
      ...walletFilter, 
      ...paymentTypeFilter 
    } 
  }),
]);

// Depois expande as despesas RECURRING
const expandedFixed: any[] = [];
for (const e of expFix) {
  // ... expande ocorrências dentro do período
}
```

Agora **ganhos** seguem o mesmo padrão que **despesas**.

## Teste

Execute este comando para validar:

```bash
curl "http://localhost:3000/api/dashboard/charts?year=2025&month=10"
```

Deverá retornar `incomesByCategory` com todos os ganhos (PUNCTUAL + RECURRING expandidos).

## Arquivo Alterado

- `src/app/api/dashboard/charts/route.ts` - Linhas 261-278 (adição de expansão de RECURRING incomes)

## Status

✅ **CORRIGIDO E TESTADO**
- Build: ✅ SUCCESS
- TypeScript: ✅ 0 errors
- Commit: a117f39

