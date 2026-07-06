const express = require('express');
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');
const { TIER_LIMITS } = require('../middleware/usageLimit');

const router = express.Router();

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic access with limited generations',
    monthlyGenerations: TIER_LIMITS.free.monthly,
    priceCents: 0,
    features: [
      '5 generations per month',
      'AI-generated descriptions',
      'AI-generated hashtags',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited generations for content creators',
    monthlyGenerations: TIER_LIMITS.pro.monthly,
    priceCents: 999,
    features: [
      '100 generations per month',
      'AI-generated descriptions',
      'AI-generated hashtags',
      'Priority processing',
      'Email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited usage with API access and priority support',
    monthlyGenerations: 'Unlimited',
    priceCents: 4999,
    features: [
      'Unlimited generations',
      'AI-generated descriptions',
      'AI-generated hashtags',
      'Priority processing',
      'API access',
      'Dedicated support',
    ],
  },
];

router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

router.get('/current', requireAuth, async (req, res, next) => {
  try {
    const user = await db('users')
      .select(
        'id', 'subscription_tier_id', 'subscription_status',
        'subscription_period_end', 'generations_used_this_month',
        'stripe_customer_id', 'stripe_subscription_id'
      )
      .where({ id: req.user.id })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await db('uploads')
      .where({ user_id: req.user.id })
      .where('created_at', '>=', startOfMonth.toISOString())
      .count('* as count')
      .first();

    const usedCount = parseInt(usage.count, 10);

    const plan = PLANS.find((p) => p.id === user.subscription_tier_id) || PLANS[0];
    const limit = TIER_LIMITS[user.subscription_tier_id];

    res.json({
      tier: user.subscription_tier_id,
      status: user.subscription_status,
      periodEnd: user.subscription_period_end,
      usage: {
        used: usedCount,
        limit: limit ? limit.monthly : 5,
        remaining: limit && limit.monthly !== -1
          ? Math.max(0, limit.monthly - usedCount)
          : 'Unlimited',
      },
      plan,
      stripeCustomerId: user.stripe_customer_id,
      stripeSubscriptionId: user.stripe_subscription_id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
