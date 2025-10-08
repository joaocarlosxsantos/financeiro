import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/notifications/[id] - Get specific notification
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        isActive: true,
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] - Update specific notification
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateNotificationSchema.parse(body);

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        isActive: true,
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json(updatedNotification);

  } catch (error) {
    console.error('Error updating notification:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete (deactivate) specific notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        isActive: true,
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ message: 'Notificação removida com sucesso' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}