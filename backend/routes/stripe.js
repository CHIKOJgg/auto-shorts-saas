const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db/knex');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

const PRICE_MAP = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

const TIER_MAP = {
  [process.env.STRIPE_PRICE_PRO]: 'pro',
  [process.env.STRIPE_PRICE_ENTERPRISE]: 'enterprise',
};

router.post('/create-checkout-session', requireAuth, async (req, res, next) => {
  try {
    const { tier } = req.body;

    if (!tier || !PRICE_MAP[tier]) {
      throw new AppError('Invalid tier specified');
    }

    let customerId = null;
    const user = await db('users').where({ id: req.user.id }).first();

    if (user.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_MAP[tier], quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: String(user.id),
      metadata: { userId: String(user.id), tier },
      success_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/pricing`,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

router.post('/create-portal-session', requireAuth, async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();

    if (!user.stripe_customer_id) {
      throw new AppError('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata.userId, 10);
        const tier = session.metadata.tier;

        if (session.customer) {
          await db('users').where({ id: userId }).update({
            stripe_customer_id: session.customer,
          });
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await db('users').where({ id: userId }).update({
          stripe_subscription_id: session.subscription,
          subscription_tier_id: tier,
          subscription_status: subscription.status,
          subscription_period_end: new Date(subscription.current_period_end * 1000),
          generations_used_this_month: 0,
          generations_reset_at: new Date(),
        });

        logger.info({ userId, tier }, 'Subscription activated via checkout');
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = await db('users').where({ stripe_subscription_id: sub.id }).first();
        if (user) {
          const tier = TIER_MAP[sub.items.data[0].price.id] || 'free';
          await db('users').where({ id: user.id }).update({
            subscription_tier_id: tier,
            subscription_status: sub.status,
            subscription_period_end: new Date(sub.current_period_end * 1000),
          });
          logger.info({ userId: user.id, tier, status: sub.status }, 'Subscription updated');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        const deletedUser = await db('users').where({ stripe_subscription_id: deletedSub.id }).first();
        if (deletedUser) {
          await db('users').where({ id: deletedUser.id }).update({
            subscription_tier_id: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            generations_used_this_month: 0,
            generations_reset_at: new Date(),
          });
          logger.info({ userId: deletedUser.id }, 'Subscription canceled, reverted to free');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const failedUser = await db('users').where({ stripe_customer_id: invoice.customer }).first();
        if (failedUser) {
          await db('users').where({ id: failedUser.id }).update({
            subscription_status: 'past_due',
          });
          logger.warn({ userId: failedUser.id }, 'Payment failed');
        }
        break;
      }

      default:
        logger.info({ type: event.type }, 'Unhandled Stripe event');
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, 'Stripe webhook handler error');
    res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
