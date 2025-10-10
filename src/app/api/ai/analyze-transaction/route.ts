import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeTransactionWithAI, batchAnalyzeTransactions } from '@/lib/ai-categorization';

/**
 * API para análise inteligente de transações usando IA
 * POST /api/ai/analyze-transaction
 */
export async function POST(req: NextRequest) {
  try {
    // Verifica autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { transactions, single } = body;

    // Análise de transação única
    if (single && body.description !== undefined && body.amount !== undefined) {
      const analysis = await analyzeTransactionWithAI(
        body.description,
        body.amount,
        user.categories
      );

      return NextResponse.json({
        success: true,
        analysis
      });
    }

    // Análise em lote
    if (transactions && Array.isArray(transactions)) {
      const analyses = await batchAnalyzeTransactions(
        transactions,
        user.categories
      );

      return NextResponse.json({
        success: true,
        analyses
      });
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos. Forneça "single" com description/amount ou "transactions" como array' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro na análise de transação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * API para criar categoria automaticamente baseada na sugestão da IA
 * POST /api/ai/create-category
 */
export async function PUT(req: NextRequest) {
  try {
    // Verifica autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, type, color, icon } = body;

    // Validações
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nome e tipo da categoria são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['EXPENSE', 'INCOME', 'BOTH'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo deve ser EXPENSE, INCOME ou BOTH' },
        { status: 400 }
      );
    }

    // Verifica se categoria já existe
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: {
          equals: name,
          mode: 'insensitive'
        },
        type
      }
    });

    if (existingCategory) {
      return NextResponse.json({
        success: true,
        category: existingCategory,
        created: false,
        message: 'Categoria já existe'
      });
    }

    // Cria nova categoria
    const newCategory = await prisma.category.create({
      data: {
        name,
        type,
        color: color || '#6B7280',
        icon: icon || null,
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      category: newCategory,
      created: true,
      message: 'Categoria criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}