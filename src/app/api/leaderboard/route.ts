import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/leaderboard
 * Retorna ranking de usuários por pontos
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'points'; // points, level, streak

    let orderBy: any = { points: 'desc' };

    if (type === 'level') {
      orderBy = { level: 'desc' };
    } else if (type === 'streak') {
      orderBy = { currentStreak: 'desc' };
    }

    // Busca top usuários
    const topUsers = await prisma.userStats.findMany({
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Busca posição do usuário atual
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        stats: true,
      },
    });

    if (!currentUser?.stats) {
      return NextResponse.json({
        topUsers: topUsers.map((stat: any, index: number) => ({
          rank: index + 1,
          userId: stat.user.id,
          name: stat.user.name || 'Usuário',
          image: stat.user.image,
          points: stat.points,
          level: stat.level,
          currentStreak: stat.currentStreak,
          totalAchievements: stat.totalAchievements,
        })),
        currentUserRank: null,
      });
    }

    // Calcula posição do usuário atual
    const usersAbove = await prisma.userStats.count({
      where: {
        [type === 'level' ? 'level' : type === 'streak' ? 'currentStreak' : 'points']: {
          gt: type === 'level' 
            ? currentUser.stats.level 
            : type === 'streak' 
              ? currentUser.stats.currentStreak 
              : currentUser.stats.points,
        },
      },
    });

    const currentUserRank = usersAbove + 1;

    return NextResponse.json({
      topUsers: topUsers.map((stat: any, index: number) => ({
        rank: index + 1,
        userId: stat.user.id,
        name: stat.user.name || 'Usuário',
        image: stat.user.image,
        points: stat.points,
        level: stat.level,
        currentStreak: stat.currentStreak,
        totalAchievements: stat.totalAchievements,
        isCurrentUser: stat.user.id === currentUser.id,
      })),
      currentUserRank: {
        rank: currentUserRank,
        userId: currentUser.id,
        name: currentUser.name || 'Você',
        image: currentUser.image,
        points: currentUser.stats.points,
        level: currentUser.stats.level,
        currentStreak: currentUser.stats.currentStreak,
        totalAchievements: currentUser.stats.totalAchievements,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ranking' },
      { status: 500 }
    );
  }
}
