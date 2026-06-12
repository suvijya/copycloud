import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const clipboardItems = new Map<string, any[]>();

export async function clipboardRoutes(fastify: FastifyInstance) {
  // Get all clipboard items for user
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const items = clipboardItems.get(userId) || [];
    return { success: true, data: items };
  });
  
  // Add new clipboard item
  fastify.post('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { content_type, encrypted_content, metadata, device_id } = request.body as any;
    
    const item = {
      id: uuidv4(),
      user_id: userId,
      device_id,
      content_type,
      encrypted_content,
      metadata: {
        ...metadata,
        pinned: false,
      },
      created_at: new Date(),
    };
    
    const items = clipboardItems.get(userId) || [];
    items.unshift(item);
    
    // Keep only last 100 items
    if (items.length > 100) {
      items.pop();
    }
    
    clipboardItems.set(userId, items);
    
    // Broadcast to other devices via WebSocket
    broadcastToUser(userId, {
      type: 'clipboard_update',
      payload: item,
    });
    
    return { success: true, data: item };
  });
  
  // Delete clipboard item
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const filtered = items.filter(item => item.id !== id);
    clipboardItems.set(userId, filtered);
    
    return { success: true };
  });
  
  // Pin/unpin item
  fastify.patch('/:id/pin', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const item = items.find(item => item.id === id);
    
    if (item) {
      item.metadata.pinned = !item.metadata.pinned;
    }
    
    return { success: true, data: item };
  });
}

// WebSocket broadcast helper
function broadcastToUser(userId: string, message: any) {
  // This will be implemented with WebSocket connections
  console.log(`Broadcasting to user ${userId}:`, message);
}