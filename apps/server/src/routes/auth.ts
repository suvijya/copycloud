import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/index';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  display_name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      
      // Check if user exists
      const existing = await UserModel.findByEmail(body.email);
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: 'Email already registered',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await UserModel.create({
        email: body.email,
        password_hash: passwordHash,
        display_name: body.display_name || body.email.split('@')[0],
      });

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          plan: user.plan,
        },
      };
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

  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      
      // Find user
      const user = await UserModel.findByEmail(body.email);
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      const valid = await bcrypt.compare(body.password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          plan: user.plan,
        },
      };
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

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const user = await UserModel.findById(request.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        plan: user.plan,
        created_at: user.created_at,
      },
    };
  });
}
