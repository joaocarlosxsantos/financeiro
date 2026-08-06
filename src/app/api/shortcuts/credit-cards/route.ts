import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';
import { calculateCreditCardUsage } from '@/lib/credit-utils';

async function findUserFromSessionOrApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

function normalizeAmount(n: number) {
  // Round to 2 decimal places and ensure a Number (not string)
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

export async function GET(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);

    // IMPORTANTE: CreditCard não possui relações "incomes"/"expenses" (essas pertencem a
    // Wallet/Category/User) nem o enum PaymentType tem o valor "CREDIT" usado aqui antes —
    // essa rota falhava em runtime. Gastos/ganhos de cartão vivem em creditExpenses/
    // creditIncomes, os mesmos modelos usados por /api/credit-cards, então usamos a mesma
    // função de cálculo (calculateCreditCardUsage) para manter os números consistentes
    // entre a tela de cartões e o app de Shortcuts.
    const creditCards = await prisma.creditCard.findMany({
      where: { userId: user.id },
      include: {
        creditExpenses: { include: { childExpenses: true } },
        creditIncomes: true,
        creditBills: true,
        bank: true,
      },
      orderBy: { name: 'asc' },
    });

    const payload = creditCards.map((card: any) => {
      const { usedAmount, availableLimit, usagePercentage } = calculateCreditCardUsage({
        limit: Number(card.limit),
        creditExpenses: card.creditExpenses || [],
        creditIncomes: card.creditIncomes || [],
        creditBills: card.creditBills || [],
      });

      const limit = normalizeAmount(Number(card.limit));
      const usedAmountRounded = normalizeAmount(usedAmount);
      const availableLimitRounded = normalizeAmount(availableLimit);

      return {
        id: card.id,
        name: card.name,
        bank: card.bank ? card.bank.name : null,
        limit: limit,
        limitFormatted: formatCurrency(limit),
        usedAmount: usedAmountRounded,
        usedAmountFormatted: formatCurrency(usedAmountRounded),
        availableLimit: availableLimitRounded,
        availableLimitFormatted: formatCurrency(availableLimitRounded),
        usagePercentage: normalizeAmount(usagePercentage),
        closingDay: card.closingDay,
        dueDay: card.dueDay
      };
    })
    .filter((card: any) => card.usedAmount > 0); // Filtrar cartões sem uso

    // Sort credit cards by usage percentage descending (maior uso primeiro)
    payload.sort((a: any, b: any) => (b.usagePercentage ?? 0) - (a.usagePercentage ?? 0));

    // Return named property so clients (like Shortcuts) can reference the array by name
    return NextResponse.json({ creditCards: payload });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}