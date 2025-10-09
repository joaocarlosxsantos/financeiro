const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationReplacement() {
  console.log('🧪 Testando o sistema de substituição de notificações...\n');

  try {
    // 1. Encontrar um usuário ativo
    const user = await prisma.user.findFirst({
      include: {
        wallets: true
      }
    });

    if (!user || !user.wallets.length) {
      console.log('❌ Nenhum usuário com carteiras encontrado');
      return;
    }

    console.log(`👤 Testando com usuário: ${user.email}`);
    console.log(`💰 Carteiras disponíveis: ${user.wallets.length}`);

    // 2. Usar a primeira carteira
    const wallet = user.wallets[0];

    console.log(`🏦 Testando com carteira: ${wallet.name}`);

    // 3. Verificar notificações existentes para LOW_BALANCE
    const existingNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: 'LOW_BALANCE',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 Notificações LOW_BALANCE nas últimas 24h: ${existingNotifications.length}`);
    
    if (existingNotifications.length > 0) {
      existingNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ID: ${notif.id} | Ativa: ${notif.isActive} | Lida: ${notif.isRead} | Criada: ${notif.createdAt.toLocaleString()}`);
      });
    }

    // 4. Simular criação de uma despesa
    console.log('\n💸 Criando despesa para testar notificações...');
    
    const expenseAmount = 1000; // Valor fixo para teste
    
    const category = await prisma.category.findFirst({
      where: { userId: user.id, type: 'EXPENSE' }
    });

    if (!category) {
      console.log('❌ Nenhuma categoria de despesa encontrada');
      return;
    }

    const newExpense = await prisma.expense.create({
      data: {
        description: `Teste de notificação - ${new Date().toISOString()}`,
        amount: expenseAmount,
        date: new Date(),
        type: 'VARIABLE',
        userId: user.id,
        categoryId: category.id,
        walletId: wallet.id
      }
    });

    console.log(`✅ Despesa criada: R$ ${expenseAmount} (ID: ${newExpense.id})`);

    // 5. Processar alertas (simular o que acontece na API)
    const { processTransactionAlerts } = require('./src/lib/notifications/processor');
    
    console.log('\n🔄 Processando alertas de transação...');
    await processTransactionAlerts(user.id);
    
    // 6. Verificar novas notificações
    const newNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: 'LOW_BALANCE',
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000) // últimos 2 minutos
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📬 Novas notificações LOW_BALANCE: ${newNotifications.length}`);
    
    if (newNotifications.length > 0) {
      newNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ID: ${notif.id} | Ativa: ${notif.isActive} | Lida: ${notif.isRead}`);
        console.log(`      Criada: ${notif.createdAt.toLocaleString()}`);
        console.log(`      Dados: ${JSON.stringify(notif.data, null, 2)}`);
      });
    }

    // 7. Verificar se notificações antigas foram desativadas
    const allNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: 'LOW_BALANCE',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📊 Resumo de todas as notificações LOW_BALANCE (24h):`);
    console.log(`   Total: ${allNotifications.length}`);
    console.log(`   Ativas: ${allNotifications.filter(n => n.isActive).length}`);
    console.log(`   Inativas: ${allNotifications.filter(n => !n.isActive).length}`);
    console.log(`   Lidas: ${allNotifications.filter(n => n.isRead).length}`);
    console.log(`   Não lidas: ${allNotifications.filter(n => !n.isRead).length}`);

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testNotificationReplacement();