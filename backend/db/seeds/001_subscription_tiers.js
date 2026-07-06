exports.seed = async function (knex) {
  await knex('subscription_tiers').del();
  await knex('subscription_tiers').insert([
    {
      id: 'free',
      name: 'Free',
      description: 'Basic access with limited generations',
      monthly_generations: 5,
      price_cents: 0,
      stripe_price_id: null,
      is_active: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Unlimited generations for content creators',
      monthly_generations: 100,
      price_cents: 999,
      stripe_price_id: null,
      is_active: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Unlimited usage with API access and priority support',
      monthly_generations: -1,
      price_cents: 4999,
      stripe_price_id: null,
      is_active: true,
    },
  ]);
};
