import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';
import { z } from 'zod';
import { calculateInstallmentDates, createBillsForInstallments } from '@/lib/credit-utils';

function parseFlexibleDate(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(input);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

async function findUserFromSessionOrApiKey(req: NextRequest) {
  // Try API Key first
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  // Fallback to NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

/**
 * GET /api/shortcuts/credit-expenses
 * Lista gastos de cartão de crédito
 * 
 * Query params:
 * - creditCardId: ID do cartão (opcional)
 * - start: Data inicial (YYYY-MM-DD) (opcional)
 * - end: Data final (YYYY-MM-DD) (opcional)
 * - type: EXPENSE ou REFUND (opcional)
 * - page: Número da página (default: 1)
 * - perPage: Items por página (default: 50, max: 200)
 * 
 * Headers:
 * - Authorization: Bearer {api_key} (ou sessão NextAuth)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);

    const url = new URL(req.url);
    const creditCardId = url.searchParams.get('creditCardId');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const type = url.searchParams.get('type') as 'EXPENSE' | 'REFUND' | null;
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('perPage') || '50'), 200);
    const skip = (page - 1) * perPage;

    const where: any = {
      userId: user.id,
    };

    if (creditCardId) {
      where.creditCardId = creditCardId;
    }

    if (type) {
      where.type = type;
    }

    if (start && end) {
      where.purchaseDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const [creditExpenses, total] = await Promise.all([
      prisma.creditExpense.findMany({
        where,
        include: {
          category: true,
          creditCard: {
            include: {
              bank: true,
            },
          },
          billItems: {
            include: {
              bill: true,
            },
            orderBy: {
              installmentNumber: 'asc',
            },
          },
        },
        orderBy: {
          purchaseDate: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.creditExpense.count({ where }),
    ]);

    // Buscar dados das tags separadamente
    const expensesWithTags = await Promise.all(
      creditExpenses.map(async (expense: any) => {
        if (expense.tags && expense.tags.length > 0) {
          const tagDetails = await prisma.tag.findMany({
            where: {
              id: { in: expense.tags },
              userId: user.id,
            },
            select: {
              id: true,
              name: true,
            },
          });
          return { ...expense, tags: tagDetails };
        }
        return { ...expense, tags: [] };
      })
    );

    return NextResponse.json({
      data: expensesWithTags,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}

/**
 * POST /api/shortcuts/credit-expenses
 * Cria um novo gasto de cartão de crédito
 * 
 * Body:
 * - description: string (obrigatório) - Descrição da compra
 * - amount: number (obrigatório) - Valor total da compra
 * - purchaseDate: string (obrigatório) - Data da compra (YYYY-MM-DD, DD/MM/YYYY ou ISO)
 * - creditCardId: string (obrigatório) - ID do cartão de crédito
 * - installments: number (opcional, default: 1) - Número de parcelas (1-12)
 * - type: "EXPENSE" | "REFUND" (opcional, default: "EXPENSE")
 * - categoryId: string (opcional) - ID da categoria
 * - tags: string[] (opcional) - Array de IDs de tags
 * 
 * Headers:
 * - Authorization: Bearer {api_key} (ou sessão NextAuth)
 * 
 * Response: 201 - Gasto criado
 * {
 *   id: string,
 *   description: string,
 *   amount: number,
 *   purchaseDate: Date,
 *   installments: number,
 *   type: string,
 *   creditCard: { ... },
 *   category: { ... },
 *   billItems: [ ... ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);

    const rawBody = await req.json();
    
    // Normalize categoryId
    const body = { ...rawBody };
    if (body.categoryId === '') body.categoryId = null;
    if (body.categoryId === undefined) {
      // leave undefined
    } else if (body.categoryId === null) {
      // explicit null => keep
    } else if (typeof body.categoryId === 'object') {
      if (body.categoryId.placeholder) {
        body.categoryId = null;
      } else if ('id' in body.categoryId) {
        const idVal = body.categoryId.id;
        body.categoryId = (typeof idVal === 'string' && idVal.trim()) ? idVal : null;
      } else if ('name' in body.categoryId) {
        body.categoryId = null;
      } else {
        body.categoryId = null;
      }
    }

    // Normalize tags
    if (Array.isArray(body.tags)) {
      body.tags = body.tags
        .map((t: any) => {
          if (!t) return '';
          if (typeof t === 'string') return t === 'no-tag' ? '' : t;
          if (t.placeholder) return '';
          if (t?.id === 'no-tag') return '';
          return t?.name || t?.id || '';
        })
        .filter(Boolean);
    }

    const creditExpenseSchema = z.object({
      description: z.string().min(1, 'Descrição é obrigatória'),
      amount: z.number().positive('Valor deve ser positivo'),
      purchaseDate: z.string().min(1, 'Data da compra é obrigatória'),
      creditCardId: z.string().min(1, 'Cartão de crédito é obrigatório'),
      installments: z.number().int().min(1).max(12).optional(),
      type: z.enum(['EXPENSE', 'REFUND']).optional(),
      categoryId: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
    });

    const parse = creditExpenseSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ 
        error: parse.error.issues.map((e) => e.message).join(', ') 
      }, { status: 400 });
    }

    const {
      description,
      amount,
      purchaseDate,
      creditCardId,
      installments = 1,
      type = 'EXPENSE',
      categoryId,
      tags = [],
    } = parse.data;

    // Buscar dados do cartão de crédito
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.id,
      },
    });

    if (!creditCard) {
      return NextResponse.json({ error: 'Cartão de crédito não encontrado' }, { status: 404 });
    }

    const purchaseDateParsed = parseFlexibleDate(purchaseDate);

    // Calcular as parcelas
    const installmentDates = calculateInstallmentDates(
      creditCard,
      purchaseDateParsed,
      installments,
      amount
    );

    // Iniciar transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar o gasto principal
      const creditExpense = await tx.creditExpense.create({
        data: {
          description,
          amount,
          purchaseDate: purchaseDateParsed,
          installments,
          type,
          categoryId: categoryId || null,
          creditCardId,
          userId: user.id,
          tags,
        },
        include: {
          category: true,
          creditCard: {
            include: {
              bank: true,
            },
          },
        },
      });

      // Criar os itens da fatura (parcelas)
      const billItems = await Promise.all(
        installmentDates.map((installment) =>
          tx.creditBillItem.create({
            data: {
              creditExpenseId: creditExpense.id,
              installmentNumber: installment.installment,
              amount: installment.value,
              dueDate: installment.dueDate,
            },
          })
        )
      );

      return {
        ...creditExpense,
        billItems,
      };
    });

    // Criar faturas automaticamente
    try {
      await createBillsForInstallments(
        prisma,
        creditCard,
        installmentDates,
        user.id
      );
    } catch (billError) {
      console.error('⚠️ Erro ao criar faturas automaticamente:', billError);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}
