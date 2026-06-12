import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const devices = new Map<string, any[]>();

export async function deviceRoutes(fastify: FastifyInstance) {
  // Get all devices for user
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const userDevices = devices.get(userId) || [];
    return { success: true, data: userDevices };
  });
  
  // Register new device
  fastify.post('/register', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { name, platform, push_token } = request.body as any;
    
    const device = {
      id: uuidv4(),
      user_id: userId,
      name,
      platform,
      last_seen: new Date(),
      is_online: true,
      push_token,
    };
    
    const userDevices = devices.get(userId) || [];
    userDevices.push(device);
    devices.set(userId, userDevices);
    
    return { success: true, data: device };
  });
  
  // Update device status
  fastify.patch('/:id/status', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const { is_online } = request.body as any;
    
    const userDevices = devices.get(userId) || [];
    const device = userDevices.find(d => d.id === id);
    
    if (device) {
      device.is_online = is_online;
      device.last_seen = new Date();
    }
    
    return { success: true, data: device };
  });
  
  // Delete device
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const { id } = request.params as any;
    const userDevices = devices.get(userId) || [];
    const filtered = userDevices.filter(d => d.id !== id);
    devices.set(userId, filtered);
    
    return { success: true };
  });
}