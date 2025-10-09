import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/rateLimiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  addConnection, 
  removeConnection, 
  getConnectionStats,
  sendNotificationToUser,
  formatSSEEvent,
  type NotificationEvent 
} from '@/lib/notifications/sse-utils';

async function handleConnection(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.email;
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      
      // Add connection using utility function
      addConnection(userId, controller);

      // Send initial heartbeat
      controller.enqueue(new TextEncoder().encode(formatSSEEvent({
        id: `heartbeat-${Date.now()}`,
        type: 'heartbeat',
        data: { message: 'Connected to notifications stream' },
        timestamp: new Date(),
        userId
      })));

      // Set up periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(formatSSEEvent({
            id: `heartbeat-${Date.now()}`,
            type: 'heartbeat',
            data: { timestamp: new Date() },
            timestamp: new Date(),
            userId
          })));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on stream abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        removeConnection(userId, controller);
      });
    },
    
    cancel() {
      removeConnection(userId, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Handle GET request for SSE connection
async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return handleConnection(request);
}

// Handle POST request for sending test notifications
async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, type = 'notification' } = await request.json();
  
  // Send notification to the current user
  sendNotificationToUser(session.user.email, {
    id: `test-${Date.now()}`,
    type,
    data: { message },
    timestamp: new Date()
  });

  return Response.json({ 
    success: true, 
    message: 'Notification sent',
    stats: getConnectionStats()
  });
}

export { GET, POST };