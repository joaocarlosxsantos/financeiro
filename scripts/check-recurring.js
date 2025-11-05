require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 Verificando registros recorrentes no banco...\n');
  
  const incomes = await prisma.income.findMany({ 
    where: { isRecurring: true },
    select: { 
      id: true, 
      description: true, 
      amount: true,
      isRecurring: true, 
      startDate: true, 
      endDate: true, 
      dayOfMonth: true,
      wallet: { select: { name: true } }
    }
  });
  
  const expenses = await prisma.expense.findMany({ 
    where: { isRecurring: true },
    select: { 
      id: true, 
      description: true, 
      amount: true,
      isRecurring: true, 
      startDate: true, 
      endDate: true, 
      dayOfMonth: true,
      wallet: { select: { name: true } }
    }
  });
  
  console.log(`📊 INCOMES recorrentes: ${incomes.length}`);
  if (incomes.length > 0) {
    incomes.forEach(i => {
      console.log(`  - ${i.description} | R$ ${i.amount} | Dia ${i.dayOfMonth} | Carteira: ${i.wallet?.name}`);
      console.log(`    startDate: ${i.startDate}, endDate: ${i.endDate}, isRecurring: ${i.isRecurring}`);
    });
  }
  
  console.log(`\n📊 EXPENSES recorrentes: ${expenses.length}`);
  if (expenses.length > 0) {
    expenses.forEach(e => {
      console.log(`  - ${e.description} | R$ ${e.amount} | Dia ${e.dayOfMonth} | Carteira: ${e.wallet?.name}`);
      console.log(`    startDate: ${e.startDate}, endDate: ${e.endDate}, isRecurring: ${e.isRecurring}`);
    });
  }
  
  if (incomes.length === 0 && expenses.length === 0) {
    console.log('\n❌ NENHUM registro recorrente encontrado no banco!');
    console.log('Você precisa CRIAR um novo registro marcando o checkbox "Recorrente".');
  }
  
  await prisma.$disconnect();
})();
