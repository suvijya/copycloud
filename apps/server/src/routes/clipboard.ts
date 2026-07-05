import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { ClipboardModel, DeviceModel } from '../models/index';

// Validation schemas
const createClipSchema = z.object({
  content_type: z.enum(['text', 'image', 'file', 'rich_text']).default('text'),
  encrypted_content: z.string().optional(),
  preview: z.string().optional(),
  metadata: z.object({
    size: z.number().optional(),
    format: z.string().optional(),
    filename: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  device_id: z.string().uuid().optional(),
});

const updateClipSchema = z.object({
  pinned: z.boolean().optional(),
  preview: z.string().optional(),
});

export async function clipboardRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all clipboard items
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '100', offset = '0' } = request.query as Record<string, string>;
    
    const items = await ClipboardModel.findByUserId(
      request.user.id,
      parseInt(limit, 10)
    );

    return {
      success: true,
      data: items,
      count: items.length,
    };
  });

  // Get single clipboard item
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const item = await ClipboardModel.findById(id);
    if (!item || item.user_id !== request.user.id) {
      return reply.status(404).send({
        success: false,
        error: 'Clipboard item not found',
      });
    }

    return { success: true, data: item };
  });

  // Create clipboard item
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createClipSchema.parse(request.body);
      
      // Check limits
      const count = await ClipboardModel.countByUserId(request.user.id);
      if (count >= config.limits.maxClipboardItems) {
        // Delete oldest non-pinned items
        await ClipboardModel.deleteOldest(
          request.user.id,
          config.limits.maxClipboardItems - 1
        );
      }

      // Validate device if provided
      if (body.device_id) {
        const device = await DeviceModel.findById(body.device_id);
        if (!device || device.user_id !== request.user.id) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid device',
          });
        }
      }

      const item = await ClipboardModel.create({
        user_id: request.user.id,
        device_id: body.device_id,
        content_type: body.content_type,
        encrypted_content: body.encrypted_content,
        preview: body.preview,
        size: body.metadata?.size || 0,
        format: body.metadata?.format,
        filename: body.metadata?.filename,
        category: body.metadata?.category,
      });

      return { success: true, data: item };
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

  // Update clipboard item
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateClipSchema.parse(request.body);
      
      const item = await ClipboardModel.findById(id);
      if (!item || item.user_id !== request.user.id) {
        return reply.status(404).send({
          success: false,
          error: 'Clipboard item not found',
        });
      }

      const updated = await ClipboardModel.update(id, body);
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

  // Toggle pin
  fastify.post('/:id/pin', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const item = await ClipboardModel.findById(id);
    if (!item || item.user_id !== request.user.id) {
      return reply.status(404).send({
        success: false,
        error: 'Clipboard item not found',
      });
    }

    const updated = await ClipboardModel.togglePin(id);
    return { success: true, data: updated };
  });

  // Delete clipboard item
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const item = await ClipboardModel.findById(id);
    if (!item || item.user_id !== request.user.id) {
      return reply.status(404).send({
        success: false,
        error: 'Clipboard item not found',
      });
    }

    await ClipboardModel.delete(id);
    return { success: true };
  });

  // Clear all clipboard items
  fastify.delete('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    await ClipboardModel.deleteByUserId(request.user.id);
    return { success: true };
  });
}
