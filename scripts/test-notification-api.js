const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationAPI() {
  console.log('🧪 Testando o sistema de notificações via API...\n');

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

    // 2. Verificar notificações existentes
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

    // 3. Criar uma despesa para testar
    console.log('\n💸 Criando despesa via API...');
    
    const wallet = user.wallets[0];
    const category = await prisma.category.findFirst({
      where: { userId: user.id, type: 'EXPENSE' }
    });

    if (!category) {
      console.log('❌ Nenhuma categoria encontrada');
      return;
    }

    // Simular chamada para API de despesas
    const expenseData = {
      description: `Teste notificação - ${new Date().toISOString()}`,
      amount: 2000, // Valor alto para potencialmente gerar alerta
      date: new Date().toISOString(),
      type: 'VARIABLE',
      categoryId: category.id,
      walletId: wallet.id
    };

    console.log('📤 Dados da despesa:', expenseData);
    console.log('\n⚠️  Para testar completamente, você precisa fazer uma requisição POST para:');
    console.log('   http://localhost:3000/api/expenses');
    console.log('   Com os dados acima no body da requisição');

    // 4. Aguardar um pouco e verificar novas notificações
    console.log('\n⏳ Aguarde alguns segundos e depois verifique as notificações...');
    
    // Simular que passaram alguns segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    console.log(`\n📊 Resumo atual de notificações LOW_BALANCE (24h):`);
    console.log(`   Total: ${allNotifications.length}`);
    console.log(`   Ativas: ${allNotifications.filter(n => n.isActive).length}`);
    console.log(`   Inativas: ${allNotifications.filter(n => !n.isActive).length}`);
    console.log(`   Lidas: ${allNotifications.filter(n => n.isRead).length}`);
    console.log(`   Não lidas: ${allNotifications.filter(n => !n.isRead).length}`);

    // 5. Verificar API de notificações
    console.log('\n🔍 Para testar a API de notificações, acesse:');
    console.log('   http://localhost:3000/api/notifications?limit=50');
    console.log('   (Deve retornar apenas notificações ativas)');

    console.log('\n✅ Script de verificação concluído!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Crie uma despesa no sistema web');
    console.log('   2. Verifique se a notificação aparece');
    console.log('   3. Teste os cenários de substituição de notificações');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationAPI();