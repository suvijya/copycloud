import { FastifyInstance } from 'fastify';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const users = new Map<string, any>();

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const { email, password } = request.body as any;
    
    if (users.has(email)) {
      return reply.status(400).send({ error: 'User already exists' });
    }
    
    const passwordHash = await hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      created_at: new Date(),
      plan: 'free',
    };
    
    users.set(email, user);
    
    const token = fastify.jwt.sign({ id: user.id, email });
    
    return { success: true, token, user: { id: user.id, email } };
  });
  
  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    
    const user = users.get(email);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const valid = await compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    
    const token = fastify.jwt.sign({ id: user.id, email });
    
    return { success: true, token, user: { id: user.id, email } };
  });
}