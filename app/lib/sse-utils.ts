// Store active connections
const connections = new Map<string, WritableStreamDefaultWriter>();

// Function to send events to specific user
export function sendEventToUser(userId: string, eventType: string, data: any) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const encoder = new TextEncoder();
      const event = {
        type: eventType,
        data: data,
        timestamp: new Date().toISOString(),
      };
      
      connection.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    } catch (error) {
      console.error('Error sending event to user:', error);
      connections.delete(userId);
    }
  }
}

// Function to broadcast events to all connected users
export function broadcastEvent(eventType: string, data: any) {
  const encoder = new TextEncoder();
  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };
  
  const eventData = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  
  connections.forEach((connection, userId) => {
    try {
      connection.enqueue(eventData);
    } catch (error) {
      console.error(`Error broadcasting to user ${userId}:`, error);
      connections.delete(userId);
    }
  });
}

// Function to get connection count
export function getConnectionCount(): number {
  return connections.size;
}

// Function to add connection
export function addConnection(userId: string, writer: WritableStreamDefaultWriter) {
  connections.set(userId, writer);
}

// Function to remove connection
export function removeConnection(userId: string) {
  connections.delete(userId);
}