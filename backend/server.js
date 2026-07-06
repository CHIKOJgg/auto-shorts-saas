require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { logger } = require('./utils/logger');
const { validateEnv } = require('./utils/config');
const { startCleanupScheduler } = require('./utils/cleanup');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { closeDb, countUploads } = require('./db/database');
const uploadRouter = require('./routes/upload');
const historyRouter = require('./routes/history');

const app = express();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

const allowedOrigins = corsOrigin.split(',').map(s => s.trim());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
    }, 'request');
  });
  next();
});

app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Please try again later.' },
});
app.use('/api/upload', uploadLimiter);

app.get('/api/health', (req, res) => {
  let dbOk = false;
  let uploadCount = 0;
  try {
    uploadCount = countUploads();
    dbOk = true;
  } catch (err) {
    logger.error({ err }, 'Health check DB failure');
  }

  const diskUsage = getDiskUsage(uploadsDir);

  const status = dbOk ? 'ok' : 'degraded';
  const statusCode = dbOk ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: dbOk ? 'connected' : 'error',
    totalUploads: uploadCount,
    diskUsage,
  });
});

function getDiskUsage(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return { available: false };
    }
    const files = fs.readdirSync(dirPath);
    let totalBytes = 0;
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          totalBytes += stat.size;
        }
      } catch { }
    }
    return {
      fileCount: files.filter(f => f !== '.gitkeep').length,
      totalBytes,
    };
  } catch {
    return { available: false };
  }
}

app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  },
}));

app.use('/api/upload', uploadRouter);
app.use('/api/history', historyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const configOk = validateEnv();
  if (!configOk) {
    logger.warn('Starting with incomplete configuration (dev mode)');
  }

  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
  });

  startCleanupScheduler();

  const gracefulShutdown = (signal) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
      closeDb();
      logger.info('Server and database closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      closeDb();
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}