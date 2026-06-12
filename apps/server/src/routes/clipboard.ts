import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const clipboardItems = new Map<string, any[]>();

export async function clipboardRoutes(fastify: FastifyInstance) {
  // Get all clipboard items for user
  fastify.get('/', { preHandler: (fastify as any).authenticate }, async (request, reply) => {
    const userId = (request as any).user?.id;
    const items = clipboardItems.get(userId) || [];
    return { success: true, data: items };
  });
  
  // Add new clipboard item
  fastify.post('/', { preHandler: (fastify as any).authenticate }, async (request, reply) => {
    const userId = (request as any).user?.id;
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
    
    if (items.length > 100) {
      items.pop();
    }
    
    clipboardItems.set(userId, items);
    return { success: true, data: item };
  });
  
  // Delete clipboard item
  fastify.delete('/:id', { preHandler: (fastify as any).authenticate }, async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const filtered = items.filter(item => item.id !== id);
    clipboardItems.set(userId, filtered);
    return { success: true };
  });
  
  // Pin/unpin item
  fastify.patch('/:id/pin', { preHandler: (fastify as any).authenticate }, async (request, reply) => {
    const userId = (request as any).user?.id;
    const { id } = request.params as any;
    const items = clipboardItems.get(userId) || [];
    const item = items.find(item => item.id === id);
    
    if (item) {
      item.metadata.pinned = !item.metadata.pinned;
    }
    
    return { success: true, data: item };
  });
}