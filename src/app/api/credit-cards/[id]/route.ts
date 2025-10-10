import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const creditCard = await prisma.creditCard.findFirst({
    where: { 
      id: params.id,
      userId: user.id 
    },
    include: {
      expenses: true,
      incomes: true,
      bank: true,
    }
  });

  if (!creditCard) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
  }

  return NextResponse.json(creditCard);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const body = await req.json();
  
  const creditCardSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    limit: z.number().min(0, 'Limite deve ser maior ou igual a zero'),
    closingDay: z.number().min(1, 'Dia de fechamento deve estar entre 1 e 31').max(31, 'Dia de fechamento deve estar entre 1 e 31'),
    dueDay: z.number().min(1, 'Dia de vencimento deve estar entre 1 e 31').max(31, 'Dia de vencimento deve estar entre 1 e 31'),
    bankId: z.string().optional(),
  });

  const parse = creditCardSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ 
      error: parse.error.issues.map(e => e.message).join(', ') 
    }, { status: 400 });
  }

  const { name, limit, closingDay, dueDay, bankId } = parse.data;

  try {
    const creditCard = await prisma.creditCard.update({
      where: { 
        id: params.id,
        userId: user.id 
      },
      data: { 
        name, 
        limit, 
        closingDay, 
        dueDay, 
        bankId: bankId || null 
      },
    });

    return NextResponse.json(creditCard);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Já existe um cartão com este nome' 
      }, { status: 400 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'Cartão não encontrado' 
      }, { status: 404 });
    }
    
    console.error('Erro ao atualizar cartão:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  try {
    // Verificar se existem transações vinculadas ao cartão
    const expensesCount = await prisma.expense.count({
      where: { creditCardId: params.id, userId: user.id }
    });

    const incomesCount = await prisma.income.count({
      where: { creditCardId: params.id, userId: user.id }
    });

    if (expensesCount > 0 || incomesCount > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir cartão com transações vinculadas' 
      }, { status: 400 });
    }

    await prisma.creditCard.delete({
      where: { 
        id: params.id,
        userId: user.id 
      },
    });

    return NextResponse.json({ message: 'Cartão excluído com sucesso' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'Cartão não encontrado' 
      }, { status: 404 });
    }
    
    console.error('Erro ao excluir cartão:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}