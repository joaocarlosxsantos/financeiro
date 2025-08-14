const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 12)
    
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Teste',
        email: 'teste@email.com',
        password: hashedPassword,
      },
    })

    console.log('Usuário criado com sucesso:', user)
    console.log('Email: teste@email.com')
    console.log('Senha: 123456')
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
