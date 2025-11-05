// Script para criar registros recorrentes de teste
const path = require('path');
const dotenvPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

// Verificar se a DATABASE_URL foi carregada
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL carregada:', process.env.DATABASE_URL.substring(0, 30) + '...');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Buscando registros para marcar como recorrentes...\n');

  // Atualiza 2 incomes como recorrentes
  const incomes = await prisma.income.findMany({
    where: {
      OR: [
        { description: { contains: 'salário', mode: 'insensitive' } },
        { description: { contains: 'salario', mode: 'insensitive' } },
        { description: { contains: 'renda', mode: 'insensitive' } },
      ],
      isRecurring: false,
    },
    take: 2,
  });

  console.log(`📊 Encontrados ${incomes.length} incomes para atualizar`);

  for (const income of incomes) {
    const updated = await prisma.income.update({
      where: { id: income.id },
      data: {
        isRecurring: true,
        startDate: income.date,
        endDate: null,
        dayOfMonth: new Date(income.date).getDate(),
        type: 'RECURRING',
      },
    });
    console.log(`✅ Income atualizado: ${updated.description} - R$ ${updated.amount}`);
  }

  // Atualiza 2 expenses como recorrentes
  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { description: { contains: 'aluguel', mode: 'insensitive' } },
        { description: { contains: 'mensalidade', mode: 'insensitive' } },
        { description: { contains: 'assinatura', mode: 'insensitive' } },
        { description: { contains: 'netflix', mode: 'insensitive' } },
        { description: { contains: 'spotify', mode: 'insensitive' } },
      ],
      isRecurring: false,
    },
    take: 2,
  });

  console.log(`\n📊 Encontrados ${expenses.length} expenses para atualizar`);

  for (const expense of expenses) {
    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        isRecurring: true,
        startDate: expense.date,
        endDate: null,
        dayOfMonth: new Date(expense.date).getDate(),
        type: 'RECURRING',
      },
    });
    console.log(`✅ Expense atualizado: ${updated.description} - R$ ${updated.amount}`);
  }

  // Mostra resumo
  console.log('\n📋 RESUMO DE REGISTROS RECORRENTES:');
  
  const allRecurringIncomes = await prisma.income.findMany({
    where: { isRecurring: true },
    select: {
      id: true,
      description: true,
      amount: true,
      isRecurring: true,
      startDate: true,
      dayOfMonth: true,
      wallet: { select: { name: true } },
    },
  });

  const allRecurringExpenses = await prisma.expense.findMany({
    where: { isRecurring: true },
    select: {
      id: true,
      description: true,
      amount: true,
      isRecurring: true,
      startDate: true,
      dayOfMonth: true,
      wallet: { select: { name: true } },
    },
  });

  console.log(`\n💰 INCOMES RECORRENTES (${allRecurringIncomes.length}):`);
  allRecurringIncomes.forEach(i => {
    console.log(`  - ${i.description} | R$ ${i.amount} | Dia ${i.dayOfMonth} | Carteira: ${i.wallet?.name || 'N/A'}`);
  });

  console.log(`\n💸 EXPENSES RECORRENTES (${allRecurringExpenses.length}):`);
  allRecurringExpenses.forEach(e => {
    console.log(`  - ${e.description} | R$ ${e.amount} | Dia ${e.dayOfMonth} | Carteira: ${e.wallet?.name || 'N/A'}`);
  });

  console.log('\n✨ Pronto! Agora acesse a tela de carteiras e veja os logs.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
