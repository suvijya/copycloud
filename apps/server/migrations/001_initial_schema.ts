import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('display_name');
    table.enum('plan', ['free', 'pro']).defaultTo('free');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login');
    table.timestamps(true, true);
    
    table.index('email');
    table.index('created_at');
  });

  // Devices table
  await knex.schema.createTable('devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('device_id').notNullable();
    table.string('name').notNullable();
    table.enum('platform', ['windows', 'macos', 'linux', 'ios', 'android', 'web']).notNullable();
    table.string('push_token');
    table.boolean('is_online').defaultTo(false);
    table.timestamp('last_seen').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.unique(['user_id', 'device_id']);
    table.index('user_id');
    table.index('device_id');
    table.index('is_online');
  });

  // Clipboard items table
  await knex.schema.createTable('clipboard_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('device_id').references('id').inTable('devices').onDelete('SET NULL');
    table.enum('content_type', ['text', 'image', 'file', 'rich_text']).defaultTo('text');
    table.text('encrypted_content');
    table.text('preview');
    table.integer('size').defaultTo(0);
    table.string('format');
    table.string('filename');
    table.string('category');
    table.boolean('pinned').defaultTo(false);
    table.timestamp('expires_at');
    table.timestamps(true, true);
    
    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'pinned']);
    table.index('content_type');
  });

  // Pairings table (device-to-device)
  await knex.schema.createTable('pairings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('device_a_id').notNullable();
    table.uuid('device_b_id').notNullable();
    table.string('encryption_key').notNullable();
    table.string('device_a_name');
    table.string('device_b_name');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
    
    table.unique(['device_a_id', 'device_b_id']);
    table.index('device_a_id');
    table.index('device_b_id');
  });

  // Sessions table (for WebSocket connections)
  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('device_id').references('id').inTable('devices').onDelete('CASCADE');
    table.string('token').notNullable();
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
    
    table.index('token');
    table.index('user_id');
    table.index('expires_at');
  });

  // API keys table
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('key').unique().notNullable();
    table.string('name');
    table.jsonb('permissions').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used');
    table.timestamps(true, true);
    
    table.index('key');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('pairings');
  await knex.schema.dropTableIfExists('clipboard_items');
  await knex.schema.dropTableIfExists('devices');
  await knex.schema.dropTableIfExists('users');
}
