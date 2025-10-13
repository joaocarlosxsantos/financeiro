const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTransferCategoryToExistingUsers() {
  try {
    console.log('Verificando usuários sem categoria de transferência...');
    
    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });

    console.log(`Encontrados ${users.length} usuários`);

    for (const user of users) {
      // Verificar se o usuário já tem a categoria de transferência
      const existingCategory = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: 'Transferência entre Contas',
          type: 'BOTH',
        },
      });

      if (!existingCategory) {
        // Criar categoria de transferência para o usuário
        await prisma.category.create({
          data: {
            name: 'Transferência entre Contas',
            color: '#6B7280',
            icon: '💸',
            type: 'BOTH',
            userId: user.id,
          },
        });
        console.log(`Categoria de transferência criada para usuário: ${user.email}`);
      } else {
        console.log(`Usuário ${user.email} já possui categoria de transferência`);
      }
    }

    console.log('Processo concluído!');
  } catch (error) {
    console.error('Erro ao adicionar categorias de transferência:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTransferCategoryToExistingUsers();