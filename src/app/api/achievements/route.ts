import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAllAchievements } from '@/lib/achievement-checker';

/**
 * GET /api/achievements
 * Retorna todas as conquistas do usuário
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verifica novas conquistas antes de retornar
    await checkAllAchievements(user.id);

    // Busca conquistas e estatísticas
    const [achievements, stats] = await Promise.all([
      prisma.achievement.findMany({
        where: { userId: user.id },
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.userStats.findUnique({
        where: { userId: user.id },
      }),
    ]);

    // Se não tem stats, cria
    if (!stats) {
      const newStats = await prisma.userStats.create({
        data: {
          userId: user.id,
          totalAchievements: achievements.length,
          points: 0,
          level: 1,
        },
      });

      return NextResponse.json({
        achievements,
        stats: newStats,
      });
    }

    return NextResponse.json({
      achievements,
      stats,
    });
  } catch (error) {
    console.error('Erro ao buscar achievements:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conquistas' },
      { status: 500 }
    );
  }
}
