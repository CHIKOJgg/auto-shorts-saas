exports.up = function (knex) {
  return knex.schema
    .raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    .createTable('subscription_tiers', (table) => {
      table.text('id').primary();
      table.text('name').notNullable();
      table.text('description').notNullable();
      table.integer('monthly_generations').notNullable();
      table.integer('price_cents').notNullable().defaultTo(0);
      table.text('stripe_price_id');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.text('email').unique().notNullable();
      table.text('password_hash').notNullable();
      table.text('name').notNullable();
      table.text('subscription_tier_id').notNullable().defaultTo('free');
      table.text('stripe_customer_id').unique();
      table.text('stripe_subscription_id');
      table.text('subscription_status').defaultTo('active');
      table.timestamp('subscription_period_end');
      table.integer('generations_used_this_month').notNullable().defaultTo(0);
      table.timestamp('generations_reset_at');
      table.timestamps(true, true);
      table.foreign('subscription_tier_id').references('subscription_tiers.id');
    })
    .createTable('uploads', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
      table.text('filename').notNullable();
      table.text('original_name').notNullable();
      table.text('title').notNullable();
      table.text('description');
      table.specificType('tags', 'text[]').defaultTo('{}');
      table.integer('file_size').notNullable().defaultTo(0);
      table.text('mime_type');
      table.text('ip_address');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index('user_id');
      table.index('created_at');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('uploads')
    .dropTableIfExists('users')
    .dropTableIfExists('subscription_tiers');
};
