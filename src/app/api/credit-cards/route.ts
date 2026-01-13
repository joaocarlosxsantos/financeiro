import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const creditCards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    include: {
      creditExpenses: {
        include: {
          childExpenses: true
        }
      },
      creditIncomes: true,
      creditBills: true,
      bank: true,
    },
    orderBy: { name: 'asc' }
  });

  // Calcular o valor utilizado de cada cartão
  const creditCardsWithUsage = creditCards.map((card: any) => {
    // Calcular valor utilizado baseado nos gastos de crédito
    let totalExpenses = 0;
    
    // Primeiro, identificar quais são registros pai (que têm childExpenses)
    const parentIds = new Set();
    (card.creditExpenses || []).forEach((expense: any) => {
      if (expense.childExpenses && expense.childExpenses.length > 0) {
        parentIds.add(expense.id);
        // Também marcar os IDs dos children para evitar contagem dupla
        expense.childExpenses.forEach((child: any) => {
          parentIds.add(child.id);
        });
      }
    });
    
    (card.creditExpenses || []).forEach((expense: any) => {
      const amount = Number(expense.amount || 0);
      const hasChildren = expense.childExpenses && expense.childExpenses.length > 0;
      
      if (hasChildren) {
        // Registro pai: contar apenas as parcelas filhas
        expense.childExpenses.forEach((child: any) => {
          const childAmount = Number(child.amount || 0);
          const childType = child.type || 'EXPENSE';
          
          if (!childType || childType === 'EXPENSE') {
            totalExpenses += Math.abs(childAmount);
          } else if (childType === 'REFUND') {
            totalExpenses -= Math.abs(childAmount);
          }
        });
      } else if (!parentIds.has(expense.id)) {
        // Registros independentes (que não fazem parte de estrutura pai-filho)
        if (!expense.type || expense.type === 'EXPENSE') {
          totalExpenses += Math.abs(amount);
        } else if (expense.type === 'REFUND') {
          totalExpenses -= Math.abs(amount);
        }
      }
    });
    
    // Calcular créditos que liberam o limite (pagamentos e estornos)
    const totalIncomes = (card.creditIncomes || []).reduce((sum: number, income: any) => {
      return sum + Math.abs(Number(income.amount || 0));
    }, 0);
    
    // Valor usado = despesas (já considerando estornos) - créditos
    const rawUsedAmount = totalExpenses - totalIncomes;
    const usedAmount = Math.max(0, rawUsedAmount); // Nunca negativo
    
    // Limite disponível = limite total - valor usado
    const availableLimit = Number(card.limit) - usedAmount;
    
    // Percentual de uso baseado no limite total
    const usagePercentage = Number(card.limit) > 0 ? (usedAmount / Number(card.limit)) * 100 : 0;
    
    return {
      ...card,
      usedAmount,
      availableLimit,
      usagePercentage: Math.max(0, Math.min(100, usagePercentage)),
    };
  });

  const headers = new Headers();
  headers.set('Cache-Control', 'private, max-age=0, no-cache, no-store');
  return NextResponse.json(creditCardsWithUsage, { headers });
}

export async function POST(req: NextRequest) {
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
    const creditCard = await prisma.creditCard.create({
      data: { 
        name, 
        limit, 
        closingDay, 
        dueDay, 
        bankId: bankId || null, 
        userId: user.id 
      },
    });

    return NextResponse.json(creditCard, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Já existe um cartão com este nome' 
      }, { status: 400 });
    }
    
    console.error('Erro ao criar cartão:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}