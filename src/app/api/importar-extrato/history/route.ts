/**
 * API para buscar histórico de transações do usuário para treinamento
 * do sistema de auto-categorização
 * 
 * GET /api/importar-extrato/history
 * 
 * Retorna transações recentes com categorias e tags para construir
 * o mapa de aprendizado
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HistoricalTransaction } from '@/lib/smart-categorization';

// Marca a rota como dinâmica para evitar pré-renderização
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Busca parâmetros opcionais
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const monthsParam = searchParams.get('months');
    
    const limit = limitParam ? parseInt(limitParam) : 500; // Padrão: últimas 500 transações
    const months = monthsParam ? parseInt(monthsParam) : 6; // Padrão: últimos 6 meses
    
    // Calcula data limite (X meses atrás)
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - months);
    
    // Busca despesas com categoria
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: dateLimit },
        OR: [
          { categoryId: { not: null } },
          { tags: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        categoryId: true,
        tags: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
    
    // Busca receitas com categoria
    const incomes = await prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: dateLimit },
        OR: [
          { categoryId: { not: null } },
          { tags: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        categoryId: true,
        tags: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
    
    // Formata para o formato esperado pelo sistema de categorização
    const history: HistoricalTransaction[] = [
      ...expenses.map((e: any) => ({
        id: e.id,
        description: e.description,
        categoryId: e.categoryId,
        categoryName: e.category?.name,
        tags: e.tags || [],
        amount: Number(e.amount),
        date: e.date,
        type: 'EXPENSE' as const,
      })),
      ...incomes.map((i: any) => ({
        id: i.id,
        description: i.description,
        categoryId: i.categoryId,
        categoryName: i.category?.name,
        tags: i.tags || [],
        amount: Number(i.amount),
        date: i.date,
        type: 'INCOME' as const,
      })),
    ];
    
    // Ordena por data (mais recente primeiro)
    history.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Limita ao número máximo solicitado
    const limitedHistory = history.slice(0, limit);
    
    // Estatísticas
    const stats = {
      totalTransactions: limitedHistory.length,
      expenses: expenses.length,
      incomes: incomes.length,
      oldestDate: limitedHistory.length > 0 
        ? limitedHistory[limitedHistory.length - 1].date 
        : null,
      newestDate: limitedHistory.length > 0 
        ? limitedHistory[0].date 
        : null,
    };
    
    return NextResponse.json({
      success: true,
      history: limitedHistory,
      stats,
    });
    
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico', details: error.message },
      { status: 500 }
    );
  }
}
