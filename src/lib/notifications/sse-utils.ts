/**
 * Utilitários para notifications em tempo real (SSE)
 */

interface NotificationEvent {
  id: string;
  type: 'notification' | 'alert' | 'heartbeat';
  data: any;
  timestamp: Date;
  userId: string;
}

// Store active SSE connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Format SSE event data
function formatSSEEvent(event: NotificationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

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

// Get connection statistics
export function getConnectionStats() {
  return {
    totalConnections: Array.from(connections.values())
      .reduce((sum, set) => sum + set.size, 0),
    connectedUsers: connections.size,
    userConnectionCounts: Object.fromEntries(
      Array.from(connections.entries()).map(([userId, controllers]) => [
        userId, 
        controllers.size
      ])
    )
  };
}

// Add connection for user
export function addConnection(userId: string, controller: ReadableStreamDefaultController) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(controller);
}

// Remove connection for user
export function removeConnection(userId: string, controller: ReadableStreamDefaultController) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.delete(controller);
    if (userConnections.size === 0) {
      connections.delete(userId);
    }
  }
}

// Get connection count for user
export function getConnectionCount(userId: string): number {
  return connections.get(userId)?.size || 0;
}

// Get total connection count
export function getTotalConnections(): number {
  let total = 0;
  connections.forEach((userConnections) => {
    total += userConnections.size;
  });
  return total;
}

export { formatSSEEvent, connections };
export type { NotificationEvent };