import { WebSocket } from 'ws';

// Track connected WebSocket clients by user ID
const connections = new Map<string, Set<WebSocket>>();

export function syncWebSocket(connection: WebSocket, request: any) {
  let userId: string | null = null;
  
  connection.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth':
          // Authenticate user and track connection
          userId = message.userId;
          if (userId) {
            if (!connections.has(userId)) {
              connections.set(userId, new Set());
            }
            connections.get(userId)!.add(connection);
            
            connection.send(JSON.stringify({
              type: 'auth_success',
              message: 'Authenticated successfully',
            }));
          }
          break;
          
        case 'clipboard_update':
          // Broadcast to all user's devices except sender
          if (userId) {
            broadcastToUser(userId, message, connection);
          }
          break;
          
        case 'ping':
          connection.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  connection.on('close', () => {
    if (userId && connections.has(userId)) {
      connections.get(userId)!.delete(connection);
      if (connections.get(userId)!.size === 0) {
        connections.delete(userId);
      }
    }
  });
  
  connection.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function broadcastToUser(userId: string, message: any, excludeConnection?: WebSocket) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  
  const payload = JSON.stringify(message);
  
  userConnections.forEach((conn) => {
    if (conn !== excludeConnection && conn.readyState === WebSocket.OPEN) {
      conn.send(payload);
    }
  });
}