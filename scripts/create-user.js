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

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
