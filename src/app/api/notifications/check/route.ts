import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAllAlerts } from '@/lib/notifications/alertDetection';

// POST /api/notifications/check - Manually trigger alert checking
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Check all alerts for the user
    const alertResults = await checkAllAlerts(user.id);

    // Create notifications for each alert that should notify
    const createdNotifications = [];
    for (const result of alertResults) {
      if (result.shouldNotify && result.notification) {
        const notification = await prisma.notification.create({
          data: {
            userId: user.id,
            type: result.notification.type,
            title: result.notification.title,
            message: result.notification.message,
            priority: result.notification.priority,
            data: result.notification.data as any,
            triggeredAt: new Date(),
          }
        });
        createdNotifications.push(notification);
      }
    }

    return NextResponse.json({
      message: 'Verificação de alertas concluída',
      alertsChecked: alertResults.length,
      notificationsCreated: createdNotifications.length,
      notifications: createdNotifications
    });

  } catch (error) {
    console.error('Error checking alerts:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}