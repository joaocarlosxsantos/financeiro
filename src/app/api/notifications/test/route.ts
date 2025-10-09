import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendRealtimeNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email;
    const body = await request.json();

    // Validate request body
    if (!body.title || !body.message) {
      return NextResponse.json({ 
        error: 'Title and message are required' 
      }, { status: 400 });
    }

    // Send real-time notification
    const notification = sendRealtimeNotification(userId, {
      title: body.title,
      message: body.message,
      type: body.type || 'info',
      severity: body.severity || 'medium',
      category: body.category || 'system'
    });

    return NextResponse.json({ 
      success: true, 
      notification: {
        id: notification.id,
        title: body.title,
        message: body.message,
        type: body.type,
        sent: true
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}