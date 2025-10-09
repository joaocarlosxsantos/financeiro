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

async function testBalancesAPI() {
  console.log('🧪 Testando API de saldos das carteiras...\n');

  try {
    // Buscar usuário e carteiras
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }

    console.log(`👤 Testando com usuário: ${user.email}`);

    // Buscar carteiras com receitas e despesas
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      include: { incomes: true, expenses: true },
      orderBy: { name: 'asc' },
    });

    console.log(`\n💰 Carteiras encontradas: ${wallets.length}`);

    // Simular a lógica da API
    const payload = wallets.map((w) => {
      let balance;
      
      // Se tem saldo pré-computado
      if (typeof w.balance === 'number') {
        balance = normalizeAmount(Number(w.balance));
      } else {
        // Calcular saldo baseado em receitas e despesas
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

    // Ordenar por saldo descendente
    payload.sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));

    console.log('\n📊 Resultado da API (simulado):');
    console.log('=====================================');

    if (payload.length === 0) {
      console.log('ℹ️  Nenhuma carteira com saldo diferente de zero encontrada');
    } else {
      payload.forEach((wallet, index) => {
        console.log(`${index + 1}. ${wallet.name} (${wallet.type})`);
        console.log(`   💰 Saldo: ${wallet.balance}`);
        console.log(`   💵 Formatado: ${wallet.balanceFormatted}`);
        console.log('');
      });
    }

    console.log(`\n✅ Total de carteiras retornadas: ${payload.length}`);
    console.log(`   (Carteiras com saldo zero foram filtradas)`);

    // Mostrar todas as carteiras para comparação
    console.log('\n📋 Comparação - Todas as carteiras (incluindo saldo zero):');
    const allWallets = wallets.map((w) => {
      let balance;
      
      if (typeof w.balance === 'number') {
        balance = normalizeAmount(Number(w.balance));
      } else {
        const totalIncomes = w.incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const totalExpenses = w.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        balance = normalizeAmount(totalIncomes - totalExpenses);
      }
      
      return { 
        name: w.name, 
        type: w.type, 
        balance: balance,
        balanceFormatted: formatCurrency(balance)
      };
    });

    allWallets.forEach((wallet) => {
      const status = wallet.balance === 0 ? '🚫 FILTRADA' : '✅ INCLUÍDA';
      console.log(`   ${wallet.name}: ${wallet.balanceFormatted} ${status}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBalancesAPI();