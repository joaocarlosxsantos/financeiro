import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTemplatedNotification, NotificationTemplates } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email;
    const body = await request.json();

    // Validate template exists
    if (!body.template || !(body.template in NotificationTemplates)) {
      return NextResponse.json({ 
        error: 'Invalid template specified',
        availableTemplates: Object.keys(NotificationTemplates)
      }, { status: 400 });
    }

    // Send templated notification with dynamic parameters
    let notification;
    
    switch (body.template) {
      case 'transactionCreated':
        notification = sendTemplatedNotification(
          userId,
          'transactionCreated',
          body.amount || 100,
          body.description || 'Transação de exemplo'
        );
        break;
        
      case 'budgetWarning':
        notification = sendTemplatedNotification(
          userId,
          'budgetWarning',
          body.category || 'Geral',
          body.spent || 800,
          body.limit || 1000
        );
        break;
        
      case 'goalProgress':
        notification = sendTemplatedNotification(
          userId,
          'goalProgress',
          body.goalName || 'Meta de exemplo',
          body.progress || 50
        );
        break;
        
      case 'systemUpdate':
        notification = sendTemplatedNotification(
          userId,
          'systemUpdate',
          body.version || '2.1.0'
        );
        break;
        
      default:
        // Generic template call
        notification = sendTemplatedNotification(userId, body.template as any);
    }

    return NextResponse.json({ 
      success: true, 
      template: body.template,
      notification: {
        id: notification.id,
        template: body.template,
        sent: true
      }
    });

  } catch (error) {
    console.error('Error sending templated notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}