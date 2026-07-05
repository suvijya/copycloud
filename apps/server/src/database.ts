import knex, { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config.database.url,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.join(__dirname, '../migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, '../seeds'),
  },
};

export const db = knex(knexConfig);

export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');

    // Run migrations
    await db.migrate.latest();
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
