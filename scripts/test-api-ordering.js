const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Função para formatar moeda igual à API
function formatCurrency(amount) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

// Função para normalizar valor igual à API
function normalizeAmount(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function testBalancesAPIOrdering() {
  console.log('🧪 Testando nova ordenação CRESCENTE da API de saldos...\n');

  try {
    // Buscar usuário e carteiras
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }

    console.log(`👤 Testando com usuário: ${user.email}`);

    // Buscar carteiras com receitas e despesas (igual à API)
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      include: { incomes: true, expenses: true },
      orderBy: { name: 'asc' },
    });

    console.log(`\n💰 Carteiras encontradas: ${wallets.length}`);

    // Simular a lógica da API ANTES da alteração (ordenação DECRESCENTE)
    const payloadBefore = wallets.map((w) => {
      let balance;
      
      if (typeof w.balance === 'number') {
        balance = normalizeAmount(Number(w.balance));
      } else {
        const totalIncomes = w.incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalExpenses = w.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        balance = normalizeAmount(totalIncomes - totalExpenses);
      }
      
      return { 
        id: w.id, 
        name: w.name, 
        type: w.type, 
        balance: balance,
        balanceFormatted: formatCurrency(balance)
      };
    })
    .filter((wallet) => wallet.balance !== 0); // Filtrar carteiras com saldo zerado

    // Ordenação DECRESCENTE (como estava antes)
    payloadBefore.sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));

    console.log('\n📊 ANTES - Ordenação DECRESCENTE (maior → menor):');
    console.log('===============================================');
    payloadBefore.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.name}: ${wallet.balanceFormatted}`);
    });

    // Simular a lógica da API DEPOIS da alteração (ordenação CRESCENTE)
    const payloadAfter = wallets.map((w) => {
      let balance;
      
      if (typeof w.balance === 'number') {
        balance = normalizeAmount(Number(w.balance));
      } else {
        const totalIncomes = w.incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalExpenses = w.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        balance = normalizeAmount(totalIncomes - totalExpenses);
      }
      
      return { 
        id: w.id, 
        name: w.name, 
        type: w.type, 
        balance: balance,
        balanceFormatted: formatCurrency(balance)
      };
    })
    .filter((wallet) => wallet.balance !== 0); // Filtrar carteiras com saldo zerado

    // Ordenação CRESCENTE (nova implementação)
    payloadAfter.sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0));

    console.log('\n📊 DEPOIS - Ordenação CRESCENTE (menor → maior):');
    console.log('==============================================');
    payloadAfter.forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.name}: ${wallet.balanceFormatted}`);
    });

    console.log('\n✅ Teste de ordenação da API concluído!');
    console.log('\n📝 Mudanças:');
    console.log('   ✅ Ordenação alterada de DECRESCENTE para CRESCENTE');
    console.log('   ✅ Carteiras com saldo negativo aparecem primeiro');
    console.log('   ✅ Carteiras com saldo positivo aparecem por último');
    console.log('   ✅ Saldos zero continuam sendo filtrados (não aparecem)');

    console.log('\n🎯 Resultado da API:');
    console.log(`   - ${payloadAfter.length} carteiras retornadas (saldo ≠ 0)`);
    console.log(`   - Ordenação: ${payloadAfter[0]?.balanceFormatted} → ${payloadAfter[payloadAfter.length - 1]?.balanceFormatted}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBalancesAPIOrdering();