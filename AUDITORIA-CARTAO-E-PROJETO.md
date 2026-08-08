# Auditoria — Cartão de Crédito + Projeto

Data: 2026-08-08 · Escopo: `src/lib/credit-*.ts`, `src/app/api/credit-*`, `/api/shortcuts/credit-*`, `/api/reports`, schema Prisma.
Todos os itens abaixo foram confirmados lendo o código-fonte; onde há cálculo de data, o resultado foi verificado executando a função.

---

## 1. Cartão de crédito

### 1.1 P0 — quebrado em runtime (referências a modelo/relação inexistentes)

O modelo `CreditBillItem` **não existe mais** no `schema.prisma`, mas ainda é referenciado em 5 lugares. Toda rota que passa por eles retorna 500.

| # | Local | Problema |
|---|---|---|
| 1 | `api/credit-expenses/[id]/refund/route.ts:298` | `originalExpense.billItems.filter(...)` — `billItems` não está no `include` nem existe no schema → `TypeError`. **Estorno FULL e PARTIAL falha 100% das vezes.** Só `INSTALLMENT` funciona (retorna antes, na linha 259). |
| 2 | mesmo arquivo, linhas 363/380/399/440 | `tx.creditBillItem.create / findMany / deleteMany / aggregate` — modelo inexistente. |
| 3 | `api/credit-bills/[id]/route.ts` (GET e PUT) | `include: { items: { ... } }` — `CreditBill` só tem `creditExpenses`, `creditIncomes`, `payments`. `PrismaClientValidationError` em toda chamada. |
| 4 | `api/credit-debug/route.ts` | `prisma.creditBillItem` + seleciona `creditBill.month` / `.year`, campos que não existem. |
| 5 | `api/shortcuts/credit-expenses/route.ts:94,295` | `include: { billItems }` + `tx.creditBillItem.create`. |
| 6 | `lib/credit-utils.ts:342-459` (`createBillsForInstallments`) | Corpo inteiro sobre `creditBillItem`. Bônus: linha 445 passa `adjustedAmount` (número) no parâmetro `currentDate: Date` de `calculateBillStatus`. |

**Ação:** decidir por função. `createBillsForInstallments` e `credit-debug` são deletáveis. O refund FULL/PARTIAL precisa ser reescrito sobre `CreditExpense`/`CreditIncome` (o caminho `INSTALLMENT` já mostra como).

---

### 1.2 P0 — matemática do ciclo de fatura está errada

#### (a) `calculateInstallmentDates` assume `dueDay < closingDay`

```ts
const isAfterClosing = purchaseDay > creditCard.closingDay;
const monthsToAdd = isAfterClosing ? i + 2 : i + 1;   // sempre +1 ou +2
```

O `+1 / +2` só vale quando o vencimento cai **depois** do fechamento em meses distintos (ex.: fecha 30, vence 07). Para um cartão que fecha dia 05 e vence dia 15 (configuração comum), o deslocamento correto é **0 ou +1**, não +1 ou +2.

Verificado executando a função (cartão fecha 05, vence 15):

| Compra | Resultado atual | Correto |
|---|---|---|
| 03/jan | 15/**fev** | 15/jan |
| 06/jan | 15/**mar** | 15/fev |

**Toda compra nesses cartões entra na fatura errada, um mês atrasada.**

#### (b) `calculateClosingDate` / `calculateDueDate` — clamp de dia inválido está invertido

```ts
const closingDate = new Date(year, closingMonth, creditCard.closingDay); // já transborda!
const lastDayOfMonth = new Date(year, closingMonth + 1, 0).getDate();
if (creditCard.closingDay > lastDayOfMonth) closingDate.setDate(lastDayOfMonth);
```

`new Date(2026, 1, 31)` já rola para **03/mar**. O `setDate(28)` seguinte grava **28/mar**, não 28/fev.

Verificado: cartão que fecha dia 31 / vence dia 10, fatura de **março** → `calculateClosingDate` devolve **28/mar/2026**, quando o esperado é 28/fev/2026. Fatura inteira no mês errado, e como `@@unique([creditCardId, closingDate])` usa essa data, gera faturas duplicadas.

#### (c) `isAfterClosing` sem clamp

`purchaseDay > 31` nunca é verdade — um cartão que fecha dia 31 "nunca fecha" em fevereiro/abril/junho/setembro/novembro.

**Ação recomendada:** extrair um único `src/lib/billing-cycle.ts` com `resolveBillingCycle(card, date) -> { closingDate, dueDate, billKey }`, cobrindo a matriz `closingDay × dueDay × dia-da-compra`, e substituir as três funções atuais. Esta é a correção de maior impacto do projeto.

---

### 1.3 P1 — integridade de dados

7. **`POST /api/credit-expenses` não usa transação.** Comentado explicitamente no código (`// Criar o registro PAI primeiro (sem transação)`). Cria o pai, depois N filhos, e faz `totalAmount: { increment }` em N faturas. Qualquer falha no meio deixa pai órfão e faturas com total inflado — sem rollback.

8. **`POST /api/credit-bills` (fechar fatura) tem três defeitos somados:**
   - Passa `month` **1-based** para `calculateClosingDate`/`calculateDueDate`, que esperam **0-based** (as outras chamadas no projeto passam `month - 1`). Fatura criada um mês adiante.
   - Busca `creditExpense` com `creditBillId: null` **sem `parentExpenseId: null`**. Os registros PAI *sempre* têm `creditBillId: null` → o valor **total** da compra parcelada é somado à fatura, além das parcelas. Duplicação grosseira.
   - Seleciona despesas por `purchaseDate` dentro do mês civil, ignorando `closingDay` — regra totalmente diferente da usada no `POST /api/credit-expenses`.

9. **`GET /api/credit-bills` escreve no banco e mente sobre o total.** O handler recalcula `totalAmount` em memória e devolve o valor calculado, mas só **persiste** quando o status vira `PAID`. Logo `CreditBill.totalAmount` fica permanentemente dessincronizado. Consequência direta: `POST /api/credit-bills/[id]/payments` valida "valor excede o saldo devedor" contra o `totalAmount` **armazenado** — rejeita pagamento válido, ou aceita pagamento a maior. Além disso, um `GET` com efeito colateral de escrita quebra cache e é imprevisível sob concorrência.

10. **Três fórmulas diferentes para o total da fatura**, e elas discordam sobre `CreditExpense.type === 'REFUND'`:
    - `recalculateBillTotal` (credit-bill-utils) — soma `creditExpense.amount` **sem olhar `type`**: um REFUND soma positivo.
    - `GET /api/credit-bills` e `auto-bill-status.ts` — mesma soma cega.
    - `calculateCreditCardUsage` (credit-utils) — **subtrai** REFUND.
    
    Também: `recalculateBillTotal` atualiza `totalAmount` mas **não** o `status`.

11. **`PUT /api/credit-expenses/[id]` no registro PAI não faz nada de útil.** Atualiza `amount`/`installments`/`creditCardId` no pai, mas não regenera as parcelas filhas. Como o pai tem `creditBillId: null`, os dois `recalculateBillTotal` são pulados. **Editar o valor de uma compra parcelada não altera nenhuma fatura.**

12. **`DELETE /api/credit-expenses/[id]` valida a fatura errada.** Checa `existingExpense.creditBill.status !== 'PENDING'` — mas no pai isso é sempre `null`, então a guarda nunca dispara. Deleta filhos que estão em faturas já **PAGAS**.

13. **`PUT /api/credit-bills/[id]`** permite marcar a fatura como `PAID` manualmente sem `paidAmount`. O `GET` seguinte recalcula e reverte, e o limite do cartão não é liberado (o cálculo usa `paidAmount`).

14. **Estorno por parcela não é idempotente.** A dedupe (`existingRefund`) procura `CreditExpense` com tag `refund_of_<id>`, mas `processInstallmentRefund` grava `CreditIncome` e a tag `refunded_installment_N` no pai — que nunca é verificada. Dá para estornar a mesma parcela quantas vezes quiser, gerando crédito duplicado.

15. **`return` dentro de `$transaction` não aborta.** `refund/route.ts:94` faz `return NextResponse.json({error}, {status:400})` de dentro do callback da transação. Isso só resolve a transação com um objeto `NextResponse` — a transação **commita** e a rota devolve **200 "sucesso"** com `result.refundRecords === undefined`.

16. **`POST /api/credit-expenses` com `type: 'REFUND'`** faz `totalAmount: { increment: installmentInfo.value }` com valor positivo → um estorno **aumenta** a fatura.

17. **Validações ausentes** no lançamento de compra: não checa limite disponível, não checa `amount > 0`, e limita parcelas a 12 (18x/24x é comum no mercado brasileiro).

---

### 1.4 P1 — dupla contagem entre cartão e o resto do app

**O projeto nunca decidiu entre regime de competência (data da compra) e regime de caixa (pagamento da fatura), e hoje usa os dois ao mesmo tempo:**

- `POST /api/credit-bills/[id]/payments` cria um **`Expense` real** ("Pagamento fatura") na carteira.
- `/api/reports` soma **`Expense`** (portanto o pagamento da fatura) **e** soma **`CreditExpense`** (pais, por `purchaseDate`).
- `/api/dashboard/*` e `/api/smart-report` somam **só `Expense`** — não olham `CreditExpense`.

Resultado: uma compra de R$ 1.000 no cartão aparece **duas vezes em Relatórios** (no mês da compra e no mês do pagamento), e **uma vez no Dashboard** (só no mês do pagamento, sem categoria — o `Expense` gerado não herda categoria nenhuma). Relatórios e Dashboard divergem por construção, não por bug pontual.

Esta é a decisão de arquitetura mais importante em aberto no projeto.

---

### 1.5 P2 — `calculateCreditCardUsage` é frágil por desenho

```ts
const rawUsedAmount = totalExpenses - totalIncomes - totalBillPayments;
const usedAmount = Math.max(0, rawUsedAmount);
```

É um somatório **vitalício** (todas as compras já feitas, menos todos os créditos e pagamentos já feitos). Funciona enquanto tudo bate, mas:
- O `Math.max(0, ...)` **mascara** qualquer inconsistência acumulada — o erro some da tela em vez de aparecer.
- Não distingue "compra ainda não faturada" de "fatura em aberto" — informações diferentes para o usuário.
- Cresce indefinidamente: `/api/credit-cards` carrega **todas** as despesas + filhas + **todas** as faturas de **todos** os cartões a cada request só para calcular limite.

O correto: `usado = Σ faturas em aberto (total − pago) + Σ compras ainda não faturadas`, derivado de query agregada, não de `findMany` completo.

### 1.6 Performance / segurança pontuais

- `GET /api/credit-expenses` faz **N+1**: um `tag.findMany` por despesa da página.
- 81 rotas repetem `getServerSession` + `user.findUnique` → 2 queries antes de qualquer trabalho útil.
- Só 12 rotas de 88 aplicam rate limit; só 31 usam Zod.
- `CreditExpense` não tem índice em `parentExpenseId`, apesar de `parentExpenseId: null` ser filtro em quase toda listagem.
- Rotas `/api/credit-debug`, `/api/reports/debug`, `/api/dashboard/cards/debug` expostas em produção.

### 1.7 Cobertura de testes: zero

`tests/` não tem **nenhum** teste de cartão de crédito — a área mais complexa e a que concentra todos os bugs acima. Uma tabela de casos para `calculateInstallmentDates`/`calculateClosingDate` teria pego os itens 1.2(a) e 1.2(b) imediatamente.

---

## 2. Melhorias gerais do projeto

**Arquitetura**

1. **Não existe camada de domínio.** Regra de negócio mora dentro dos route handlers, por isso a mesma regra foi reimplementada 3–5 vezes (total de fatura, uso de limite, expansão de recorrentes, health score). Extrair `src/services/credit/`, `src/services/transactions/` e deixar as rotas como casca HTTP (auth → validação → serviço → resposta).
2. **Dinheiro em `Number`.** Schema usa `Decimal(10,2)`, o código converte para `Number` em toda leitura e depois compara com tolerância de 0,005 para contornar o próprio erro de ponto flutuante. Padronizar: guardar centavos como `Int`, ou usar `Decimal` de ponta a ponta.
3. **Datas sem convenção única.** Mistura de `new Date(y, m, d)` (local) com `Date.UTC` e strings `YYYY-MM-DD`. Já causou bugs documentados (`recurring-utils`, `datetime-brasilia`). Adotar: persistir UTC, calcular sempre com timezone explícito (`date-fns-tz`, `America/Sao_Paulo`), nunca usar getters locais.
4. **Redundância `type` + `isRecurring`** em `Expense`/`Income` (já conhecida) — escolher uma fonte de verdade.
5. **`: any` em 486 pontos**, incluindo `tx: any` em todas as transações Prisma — tipagem desligada exatamente onde há dinheiro.

**Qualidade / operação**

6. Helper único `requireUser(req)` no lugar das 81 repetições de auth.
7. Erros padronizados: um `ApiError` + wrapper `withApiHandler`, em vez de try/catch com string livre por rota.
8. Validação Zod obrigatória em 100% das rotas de escrita (hoje 35%).
9. CI que rode `tsc --noEmit` + `jest` + `next build` no PR.
10. Observabilidade (Sentry ou equivalente) — hoje o diagnóstico é `console.error`, e é por isso que rotas quebradas há tempo (refund, credit-bills/[id]) passaram despercebidas.
11. Consertar os testes que já estão vermelhos (`recurring-utils`, `validation-extra`, `shortcuts.apikey`, `alert-modal`) — suíte vermelha treina a ignorar.

---

## 3. Sugestões de remoção

**Código morto / quebrado (remoção direta)**

- `src/app/api/credit-debug/route.ts` — quebrada e é rota de debug em produção.
- `src/app/api/reports/debug/route.ts`, `src/app/api/dashboard/cards/debug/route.ts` — idem.
- `src/components/credit-management/credit-expense-form-debug.tsx` — zero importadores.
- `createBillsForInstallments` (credit-utils) — quebrada e sem uso válido.
- `canFullRefund`, `calculateMaxRefundAmount`, `calculateRefundDistribution`, `shouldCreateNewBill` — importadas mas substituídas por lógica inline, ou nunca chamadas.
- `getBillPeriodForInstallment` — é função identidade (`{year, month+1}`); adiciona indireção sem valor.
- `CreditCard.availableCredit` (schema) — nunca lido nem escrito; o cálculo é dinâmico.
- Modelos `Achievement` / `Challenge` / `UserStats` no schema — features já removidas do código.
- `src/types/prisma-client-augment.d.ts` — apagar depois do `prisma db push` local.
- 18 `console.log` remanescentes.

**Decidir: consertar ou remover**

- `/api/shortcuts/credit-expenses` — quebrada (`creditBillItem`). Se os Atalhos da Apple não são usados para cartão, remover; se são, reescrever sobre o fluxo pai/filho de `/api/credit-expenses`.
- `/api/dashboard` vs `/api/dashboard-summary` vs `/api/dashboard/cards` — três rotas com escopo sobreposto; consolidar em uma.
- `/reports` vs `/smart-report` e `/credit-cards` vs `/credit-management` — sobreposição de nome já sinalizada; ou renomear ou fundir.

---

## 4. Sugestões de acréscimo

**Cartão de crédito (maior valor percebido)**

1. **Fatura em aberto (prévia).** Hoje o app só conhece fatura fechada. A informação mais consultada num app de finanças é "quanto já está na fatura deste mês" — não existe.
2. **Comprometimento futuro.** Painel de "próximas 12 faturas", mostrando quanto de cada uma já está tomado por parcelas lançadas. O dado já existe (`CreditExpense` filhos com `creditBillId`), só falta a visão.
3. **Fechamento automático idempotente.** Job diário que fecha faturas no `closingDay`, com chave única por `(cartão, closingDate)` — hoje o fechamento é manual e a rota está quebrada.
4. **Aviso de limite.** Alerta em X% de uso e aviso ao lançar compra que estoura o disponível.
5. **Assinaturas no cartão** (recorrente, não parcelado) — hoje só há parcelamento; Netflix/Spotify precisam ser relançados todo mês.
6. **Rotativo / pagamento mínimo com juros** — o modelo atual proíbe pagar menos que o total; na vida real isso acontece.
7. **Categoria no pagamento da fatura.** O `Expense` gerado hoje nasce sem categoria, o que quebra a análise por categoria no mês do pagamento. Alternativa melhor: marcar esse `Expense` como "transferência interna" e excluí-lo dos totais de gasto (resolve também o item 1.4).

**Plataforma**

8. **`billing-cycle.ts` como motor único** de datas de cartão, com testes de tabela — pré-requisito de todo o resto.
9. **Audit log** de alterações em registros financeiros (quem/quando/valor antigo→novo). Num app de dinheiro, "por que esse número mudou" precisa ter resposta.
10. **Testes E2E (Playwright)** dos fluxos de dinheiro: lançar compra parcelada → fechar fatura → pagar → conferir limite → estornar.
11. **Conciliação no import de fatura** — casar linhas importadas com lançamentos manuais já existentes em vez de duplicar.
12. **Exportação/backup** dos dados do usuário (já existe `/api/user/delete-data`; falta o inverso).

---

## Ordem sugerida de execução

| Fase | O quê | Por quê |
|---|---|---|
| 0 | ✅ Testes de tabela para o ciclo de fatura | Trava a regressão antes de mexer |
| 1 | ✅ `billing-cycle.ts` único + corrigir 1.2 (a)(b)(c) | Raiz da maioria dos erros de fatura |
| 2 | Remover/reescrever referências a `creditBillItem` (1.1) | Rotas hoje em 500 |
| 3 | Transação no POST de despesa + guardas de DELETE/PUT (1.3) | Integridade |
| 4 | Fonte única de `totalAmount` + parar de escrever no GET (1.3 §9,10) | Consistência do que a tela mostra |
| 5 | Decidir competência vs. caixa e ajustar Relatórios (1.4) | Decisão de negócio, não de código |
| 6 | Limpeza (seção 3) | Reduz superfície antes de crescer |

---

## Apêndice — Fases 0 e 1 (executadas em 2026-08-08)

**Arquivos novos**

- `src/lib/billing-cycle.ts` — motor único de ciclo. Um ciclo é identificado pelo mês em que a fatura **fecha** (`billKey = YYYY-MM` do fechamento), e o vencimento é derivado: mesmo mês se `dueDay > closingDay`, mês seguinte caso contrário. API: `resolveBillingCycle`, `getCycleByClosingMonth`, `getCycleByDueMonth`, `getInstallmentCycles`, `clampDayToMonth`.
- `tests/lib/billing-cycle.test.ts` — 50 testes, incluindo casos de regressão nomeados para cada um dos três bugs e três testes de propriedade sobre a matriz `closingDay × dueDay × dia-da-compra` (11 × 11 × 12 combinações): o vencimento nunca precede o fechamento, o fechamento nunca precede a compra, e a fatura nunca fica a mais de ~70 dias da compra.
- `scripts/diagnose-billing-cycle.mjs` — diagnóstico **somente leitura** do impacto no banco (ver abaixo).

**Arquivos alterados**

- `src/lib/credit-utils.ts` — `calculateInstallmentDates`, `calculateClosingDate` e `calculateDueDate` viraram adaptadores finos sobre `billing-cycle.ts`, com a assinatura preservada. Isso corrige os 8 pontos de chamada de uma vez, sem tocar em nenhum deles. Marcadas `@deprecated`: código novo deve usar `billing-cycle.ts` direto.
- `src/app/api/credit-bills/route.ts` — corrigido o off-by-one do item 1.3 §8: o `month` do body vem em base 1, mas as funções esperam base 0 (todos os outros pontos de chamada já passavam `month - 1`).

**Validação:** `tsc --noEmit` limpo; 69 testes verdes (50 novos + suítes vizinhas de regressão).

### Bug #4, encontrado ao rodar o diagnóstico: timezone

A primeira execução do script relatou 7 de 7 faturas divergentes num cartão que fecha 30 / vence 7 — mas com uma pista: imprimia "vence **06**/08" para um cartão que vence dia **7**. Não era o bug de clamp. Era timezone, em dois lugares:

- **No dado gravado.** `new Date(y, m, d)` produz meia-noite **no fuso de quem executa**. Em produção (UTC) isso vira `T00:00:00Z`; numa máquina em UTC-3, `T03:00:00Z`. Como `CreditBill` é buscada por igualdade **exata** em `closingDate`, dois ambientes calculando "o mesmo dia" produzem instantes diferentes — fatura não encontrada, fatura duplicada. Além disso, meia-noite UTC é exibida como o **dia anterior** por qualquer código que use getters locais em UTC-3, que é o que o próprio script fazia.
- **Na leitura da compra.** `<input type="date">` chega como `2026-07-30T00:00:00Z`. Lida com `getDate()` em UTC-3, vira dia 29 — e numa compra feita exatamente no dia do fechamento, isso muda a fatura de destino.

**Correção:** `billing-cycle.ts` opera inteiramente em **UTC ao meio-dia** (`Date.UTC(y, m, d, 12)`, leitura com `getUTC*`). Meio-dia, e não meia-noite, dá 12h de folga em cada direção contra código de exibição que ainda use getters locais. O resultado passa a ser uma função pura dos números de entrada, idêntica em qualquer fuso — travado por teste (`o instante calculado não depende do TZ do processo`).

### ⚠️ Migração de dados — obrigatória antes do deploy

As faturas existentes estão gravadas a `T00:00:00Z` e a convenção nova é `T12:00:00Z`. Sem o backfill, **nenhuma** fatura existente é reencontrada e o app cria duplicatas.

O mesmo script agora diagnostica e corrige, separando os dois tipos de divergência:

```bash
node scripts/diagnose-billing-cycle.mjs            # relatório, não altera nada
node scripts/diagnose-billing-cycle.mjs --apply    # aplica (fazer snapshot do banco antes)
```

- **"só horário"** (`00:00Z → 12:00Z`) — normalização, sem impacto de negócio.
- **"DIA ERRADO"** — o bug de clamp de fato moveu a fatura; impacto real.
- **"COLISÃO"** — o `closingDate` de destino já está ocupado por outra fatura. O script pula e reporta; exige decisão manual (provavelmente duas faturas que deveriam ser uma).

Configurações de cartão afetadas pela mudança de **dia** (além da normalização de horário, que atinge todas):

| Configuração | O que muda |
|---|---|
| `closingDay >= 29` | Corrigido o clamp: a fatura deixa de escorregar um mês em meses curtos |
| `dueDay == closingDay` | O mês de fechamento passa a ser o anterior ao de vencimento |
| `dueDay > closingDay` | As **parcelas** deixam de ser lançadas um mês atrasadas (o `closingDate` em si não muda) |

### Observação para a Fase 3

O diagnóstico mostrou uma fatura com `totalAmount = R$ -1272,07` e status `PAID`. Total negativo é sintoma dos itens **1.3 §10** (as três fórmulas de total discordam sobre o sinal de `CreditExpense.type = 'REFUND'`) e **1.3 §14** (estorno por parcela não é idempotente — dá para estornar a mesma parcela várias vezes). Vale investigar essa fatura especificamente ao atacar a Fase 3.
