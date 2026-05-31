import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const LOG_DIR = path.resolve(process.cwd(), 'logs');

/**
 * Structured JSON logger using Winston.
 * - Separate file transports for error, warn, and combined logs
 * - Console transport enabled in non-production environments
 * - All logs include timestamps in ISO format
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'ISO' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'swapskills-backend' },
  transports: [
    // Error-level logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Warn-level logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'warn.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    // All logs (combined)
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        printf(({ level, message, timestamp: ts, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${ts} [${level}]: ${message}${metaStr}`;
        })
      ),
    })
  );
}

export { logger };
