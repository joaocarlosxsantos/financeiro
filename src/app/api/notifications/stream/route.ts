import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/rateLimiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface NotificationEvent {
  id: string;
  type: 'notification' | 'alert' | 'heartbeat';
  data: any;
  timestamp: Date;
  userId: string;
}

// Store active SSE connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Send notification to specific user
export function sendNotificationToUser(userId: string, notification: Omit<NotificationEvent, 'userId'>) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const event = {
    ...notification,
    userId,
    timestamp: new Date()
  };

  const sseData = formatSSEEvent(event);
  
  // Send to all user's connections
  userConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(sseData));
    } catch (error) {
      // Remove broken connections
      userConnections.delete(controller);
    }
  });

  // Clean up empty connection sets
  if (userConnections.size === 0) {
    connections.delete(userId);
  }
}

// Broadcast to all connected users
export function broadcastNotification(notification: Omit<NotificationEvent, 'userId'>) {
  connections.forEach((_, userId) => {
    sendNotificationToUser(userId, notification);
  });
}

function formatSSEEvent(event: NotificationEvent): string {
  return `id: ${event.id}\n` +
         `event: ${event.type}\n` +
         `data: ${JSON.stringify({
           id: event.id,
           type: event.type,
           data: event.data,
           timestamp: event.timestamp,
           userId: event.userId
         })}\n\n`;
}

async function handleSSEStream(request: NextRequest) {
  // Get user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.email; // Using email as user identifier

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to user's set
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(controller);

      // Send initial connection event
      const welcomeEvent = formatSSEEvent({
        id: `connect-${Date.now()}`,
        type: 'notification',
        data: { 
          message: 'Connected to notification stream',
          status: 'connected'
        },
        timestamp: new Date(),
        userId
      });
      
      controller.enqueue(new TextEncoder().encode(welcomeEvent));

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatSSEEvent({
            id: `heartbeat-${Date.now()}`,
            type: 'heartbeat',
            data: { timestamp: new Date() },
            timestamp: new Date(),
            userId
          });
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch (error) {
          clearInterval(heartbeatInterval);
          const userConnections = connections.get(userId);
          if (userConnections) {
            userConnections.delete(controller);
            if (userConnections.size === 0) {
              connections.delete(userId);
            }
          }
        }
      }, 30000); // 30 seconds heartbeat

      // Store interval reference for cleanup
      (controller as any)._heartbeatInterval = heartbeatInterval;
    },

    cancel() {
      // Cleanup on connection close
      const userConnections = connections.get(userId);
      if (userConnections) {
        userConnections.forEach((controller) => {
          if ((controller as any)._heartbeatInterval) {
            clearInterval((controller as any)._heartbeatInterval);
          }
        });
        userConnections.clear();
        connections.delete(userId);
      }
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Apply rate limiting to SSE endpoint
export async function GET(request: NextRequest) {
  // Check rate limit first
  const rateLimitResult = await withRateLimit(request, {
    maxRequests: 10, // Max 10 SSE connections per minute per IP
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas conexões SSE. Tente novamente em alguns segundos.'
  });

  if (rateLimitResult) {
    return rateLimitResult;
  }

  // If rate limit passes, handle SSE stream
  return handleSSEStream(request);
}

// Get connection stats (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // For demo, return connection stats
  const stats = {
    totalConnections: Array.from(connections.values())
      .reduce((sum, set) => sum + set.size, 0),
    connectedUsers: connections.size,
    userConnections: Object.fromEntries(
      Array.from(connections.entries()).map(([userId, controllers]) => [
        userId, 
        controllers.size
      ])
    )
  };

  return Response.json(stats);
}