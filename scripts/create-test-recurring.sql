-- Script para criar registros recorrentes de teste
-- Atualiza algumas rendas e despesas para serem recorrentes

-- Marca 2 incomes como recorrentes (salário mensal)
UPDATE "Income"
SET 
  "isRecurring" = true,
  "startDate" = "date",
  "endDate" = NULL,
  "dayOfMonth" = EXTRACT(DAY FROM "date")::int,
  "type" = 'RECURRING'
WHERE 
  "description" ILIKE '%salário%' 
  OR "description" ILIKE '%salario%'
  OR "description" ILIKE '%renda%'
LIMIT 2;

-- Marca 2 expenses como recorrentes (aluguel, mensalidade)
UPDATE "Expense"
SET 
  "isRecurring" = true,
  "startDate" = "date",
  "endDate" = NULL,
  "dayOfMonth" = EXTRACT(DAY FROM "date")::int,
  "type" = 'RECURRING'
WHERE 
  "description" ILIKE '%aluguel%'
  OR "description" ILIKE '%mensalidade%'
  OR "description" ILIKE '%assinatura%'
LIMIT 2;

-- Mostra os registros atualizados
SELECT 'INCOMES RECORRENTES' as tipo, id, description, amount, "isRecurring", "startDate", "dayOfMonth"
FROM "Income"
WHERE "isRecurring" = true
UNION ALL
SELECT 'EXPENSES RECORRENTES' as tipo, id, description, amount, "isRecurring", "startDate", "dayOfMonth"
FROM "Expense"
WHERE "isRecurring" = true
ORDER BY tipo, description;
