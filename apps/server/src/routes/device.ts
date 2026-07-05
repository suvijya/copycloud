import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DeviceModel, PairingModel } from '../models/index';

// Validation schemas
const registerDeviceSchema = z.object({
  device_id: z.string().min(1),
  name: z.string().min(1).max(100),
  platform: z.enum(['windows', 'macos', 'linux', 'ios', 'android', 'web']),
  push_token: z.string().optional(),
});

const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  push_token: z.string().optional(),
  is_online: z.boolean().optional(),
});

export async function deviceRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all devices for user
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const devices = await DeviceModel.findByUserId(request.user.id);
    
    // Get pairing info for each device
    const devicesWithPairing = await Promise.all(
      devices.map(async (device) => {
        const pairings = await PairingModel.findByDeviceId(device.id);
        return {
          ...device,
          paired_devices: pairings.map(p => 
            p.device_a_id === device.id ? p.device_b_id : p.device_a_id
          ),
        };
      })
    );

    return { success: true, data: devicesWithPairing };
  });

  // Register device
  fastify.post('/register', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerDeviceSchema.parse(request.body);
      
      // Check if device already exists
      const existing = await DeviceModel.findByDeviceId(body.device_id);
      if (existing) {
        // Update existing device
        const updated = await DeviceModel.update(existing.id, {
          name: body.name,
          platform: body.platform,
          push_token: body.push_token,
          is_online: true,
          last_seen: new Date(),
        });
        return { success: true, data: updated };
      }

      const device = await DeviceModel.create({
        user_id: request.user.id,
        device_id: body.device_id,
        name: body.name,
        platform: body.platform,
        push_token: body.push_token,
        is_online: true,
      });

      return { success: true, data: device };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Update device
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateDeviceSchema.parse(request.body);
      
      const device = await DeviceModel.findById(id);
      if (!device || device.user_id !== request.user.id) {
        return reply.status(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      const updated = await DeviceModel.update(id, body);
      return { success: true, data: updated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Delete device
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const device = await DeviceModel.findById(id);
    if (!device || device.user_id !== request.user.id) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    // Remove all pairings for this device
    const pairings = await PairingModel.findByDeviceId(id);
    for (const pairing of pairings) {
      await PairingModel.deactivate(pairing.id);
    }

    await DeviceModel.delete(id);
    return { success: true };
  });

  // Get device pairings
  fastify.get('/:id/pairings', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const device = await DeviceModel.findById(id);
    if (!device || device.user_id !== request.user.id) {
      return reply.status(404).send({
        success: false,
        error: 'Device not found',
      });
    }

    const pairings = await PairingModel.findByDeviceId(id);
    return { success: true, data: pairings };
  });
}
