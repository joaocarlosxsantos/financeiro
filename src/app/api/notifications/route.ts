import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationFilter,
  CreateNotificationRequest 
} from '@/types/notifications';
import { z } from 'zod';

// Validation schemas
const createNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  priority: z.nativeEnum(NotificationPriority).optional(),
  data: z.any().optional(),
  scheduledFor: z.string().datetime().optional(),
});

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const filterSchema = z.object({
  isRead: z.boolean().optional(),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// GET /api/notifications - List notifications with filters
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const filterParams: any = {};
    
    // Parse query parameters
    if (searchParams.has('isRead')) {
      filterParams.isRead = searchParams.get('isRead') === 'true';
    }
    if (searchParams.has('type')) {
      filterParams.type = searchParams.get('type');
    }
    if (searchParams.has('priority')) {
      filterParams.priority = searchParams.get('priority');
    }
    if (searchParams.has('dateFrom')) {
      filterParams.dateFrom = searchParams.get('dateFrom');
    }
    if (searchParams.has('dateTo')) {
      filterParams.dateTo = searchParams.get('dateTo');
    }
    if (searchParams.has('limit')) {
      filterParams.limit = parseInt(searchParams.get('limit') || '10');
    }
    if (searchParams.has('offset')) {
      filterParams.offset = parseInt(searchParams.get('offset') || '0');
    }

    // Validate filters
    const validatedFilters = filterSchema.parse(filterParams);

    // Build where clause
    const where: any = {
      userId: user.id,
      isActive: true,
    };

    if (validatedFilters.isRead !== undefined) {
      where.isRead = validatedFilters.isRead;
    }
    if (validatedFilters.type) {
      where.type = validatedFilters.type;
    }
    if (validatedFilters.priority) {
      where.priority = validatedFilters.priority;
    }
    if (validatedFilters.dateFrom || validatedFilters.dateTo) {
      where.createdAt = {};
      if (validatedFilters.dateFrom) {
        where.createdAt.gte = new Date(validatedFilters.dateFrom);
      }
      if (validatedFilters.dateTo) {
        where.createdAt.lte = new Date(validatedFilters.dateTo);
      }
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: validatedFilters.limit || 10,
        skip: validatedFilters.offset || 0,
      }),
      prisma.notification.count({ where })
    ]);

    // Get stats
    const stats = await prisma.notification.groupBy({
      by: ['type', 'priority', 'isRead'],
      where: {
        userId: user.id,
        isActive: true,
      },
      _count: true,
    });

    const notificationStats = {
      total,
      unread: stats.filter((s: any) => !s.isRead).reduce((sum: number, s: any) => sum + s._count, 0),
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    stats.forEach((stat: any) => {
      notificationStats.byType[stat.type] = (notificationStats.byType[stat.type] || 0) + stat._count;
      notificationStats.byPriority[stat.priority] = (notificationStats.byPriority[stat.priority] || 0) + stat._count;
    });

    return NextResponse.json({
      notifications,
      stats: notificationStats,
      pagination: {
        total,
        limit: validatedFilters.limit || 10,
        offset: validatedFilters.offset || 0,
        hasMore: (validatedFilters.offset || 0) + (validatedFilters.limit || 10) < total
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/notifications - Create notification
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

    const body = await req.json();
    const validatedData = createNotificationSchema.parse(body);

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        priority: validatedData.priority || NotificationPriority.MEDIUM,
        data: validatedData.data || {},
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : null,
        triggeredAt: new Date(),
      }
    });

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/notifications - Bulk update notifications (mark all as read, etc.)
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const { action, ids } = body;

    if (action === 'markAllRead') {
      const updated = await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
          isActive: true,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ updated: updated.count });
    }

    if (action === 'markRead' && Array.isArray(ids)) {
      const updated = await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
        data: {
          isRead: true,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ updated: updated.count });
    }

    if (action === 'delete' && Array.isArray(ids)) {
      const updated = await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ deleted: updated.count });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}