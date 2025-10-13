import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 400 });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Gerar apiKey aleatória (hex, 64 chars)
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        apiKey,
      },
    });

    // Criar categoria padrão de transferência entre contas
    await prisma.category.create({
      data: {
        name: 'Transferência entre Contas',
        color: '#6B7280',
        icon: '💸',
        type: 'BOTH',
        userId: user.id,
      },
    });

    return NextResponse.json(
      { message: 'Usuário criado com sucesso', userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
