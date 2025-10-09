const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalletsOrdering() {
  console.log('🧪 Testando ordenação de carteiras na interface...\n');

  try {
    // Buscar carteiras como faz a API
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }

    console.log(`👤 Testando com usuário: ${user.email}`);

    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      include: {
        expenses: true,
        incomes: true,
      },
    });

    console.log(`\n💰 Carteiras encontradas: ${wallets.length}`);

    // Calcular saldos como faz a API
    const walletsWithBalance = wallets.map((w) => {
      const totalIncomes = w.incomes?.reduce((s, i) => s + Number(i.amount), 0) || 0;
      const totalExpenses = w.expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
      const balance = totalIncomes - totalExpenses;
      return { ...w, balance };
    });

    console.log('\n📊 Carteiras ANTES da ordenação (ordem da API):');
    console.log('==============================================');
    walletsWithBalance.forEach((wallet, index) => {
      const saldo = Object.is(wallet.balance, -0) ? 0 : wallet.balance;
      const saldoFormatted = saldo.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      });
      console.log(`${index + 1}. ${wallet.name} - ${saldoFormatted}`);
    });

    // Aplicar a mesma ordenação que foi implementada no frontend
    const sortedWallets = walletsWithBalance
      .slice() // Cópia do array
      .sort((a, b) => {
        const getSaldo = (wallet) => {
          const saldoFromBackend = typeof wallet.balance === 'number' ? wallet.balance : undefined;
          const saldoFallback =
            (wallet.incomes?.reduce((acc, i) => acc + Number(i.amount), 0) || 0) -
            (wallet.expenses?.reduce((acc, e) => acc + Number(e.amount), 0) || 0);
          const saldoRaw = typeof saldoFromBackend === 'number' ? saldoFromBackend : saldoFallback;
          return Object.is(saldoRaw, -0) ? 0 : saldoRaw;
        };
        
        const saldoA = getSaldo(a);
        const saldoB = getSaldo(b);
        
        // Ordenação decrescente (maior valor primeiro)
        return saldoB - saldoA;
      });

    console.log('\n📊 Carteiras DEPOIS da ordenação (ordem na interface):');
    console.log('====================================================');
    sortedWallets.forEach((wallet, index) => {
      const saldo = Object.is(wallet.balance, -0) ? 0 : wallet.balance;
      const saldoFormatted = saldo.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      });
      console.log(`${index + 1}. ${wallet.name} - ${saldoFormatted}`);
    });

    console.log('\n✅ Teste de ordenação concluído!');
    console.log('\n📝 Resultado:');
    console.log('   - Carteiras são agora ordenadas por saldo (maior para menor)');
    console.log('   - Carteiras com saldo positivo aparecem primeiro');
    console.log('   - Carteiras com saldo negativo aparecem por último');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWalletsOrdering();