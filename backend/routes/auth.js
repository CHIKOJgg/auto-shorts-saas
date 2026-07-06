const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/knex');
const { generateToken } = require('../utils/tokens');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format');
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters');
    }

    if (name.trim().length < 1 || name.length > 100) {
      throw new AppError('Name must be between 1 and 100 characters');
    }

    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) {
      throw new AppError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db('users').insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name.trim(),
      subscription_tier_id: 'free',
      generations_reset_at: new Date(),
    }).returning(['id', 'email', 'name', 'subscription_tier_id', 'created_at']);

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tier: user.subscription_tier_id },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required');
    }

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      throw new AppError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid email or password');
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tier: user.subscription_tier_id },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'name', 'subscription_tier_id', 'subscription_status', 'generations_used_this_month', 'created_at')
      .where({ id: req.user.id })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
