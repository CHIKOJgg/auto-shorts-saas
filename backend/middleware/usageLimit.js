const db = require('../db/knex');
const { logger } = require('../utils/logger');

const TIER_LIMITS = {
  free: { monthly: 5 },
  pro: { monthly: 100 },
  enterprise: { monthly: -1 },
};

async function checkUsageLimit(req, res, next) {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tier = user.subscription_tier_id || 'free';
    const limit = TIER_LIMITS[tier];

    if (!limit) {
      return res.status(403).json({ error: 'Invalid subscription tier' });
    }

    if (limit.monthly === -1) {
      return next();
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

    if (usedCount >= limit.monthly) {
      logger.warn({ userId: req.user.id, tier, usedCount, limit: limit.monthly }, 'Usage limit exceeded');
      return res.status(403).json({
        error: 'Monthly generation limit reached',
        limit: limit.monthly,
        used: usedCount,
        tier,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkUsageLimit, TIER_LIMITS };
