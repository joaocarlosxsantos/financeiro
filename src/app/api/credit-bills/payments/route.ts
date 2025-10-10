import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Listar todos os pagamentos de cartão do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '50');
    const skip = (page - 1) * perPage;

    const [payments, total] = await Promise.all([
      prisma.billPayment.findMany({
        where: {
          bill: {
            userId: user.id,
          },
        },
        include: {
          bill: {
            include: {
              creditCard: {
                select: {
                  id: true,
                  name: true,
                  bank: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          wallet: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.billPayment.count({
        where: {
          bill: {
            userId: user.id,
          },
        },
      }),
    ]);

    // Transformar dados para match com a interface esperada
    const transformedPayments = payments.map((payment: any) => ({
      ...payment,
      bill: {
        ...payment.bill,
        creditCard: {
          ...payment.bill.creditCard,
          bank: payment.bill.creditCard.bank?.name || 'Sem banco',
        },
      },
    }));

    return NextResponse.json({
      data: transformedPayments,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}