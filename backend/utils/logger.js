const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'body.apiKey', 'body.password'],
    censor: '[REDACTED]',
  },
});

module.exports = { logger };
