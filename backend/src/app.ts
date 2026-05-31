import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { globalLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();

// Security headers: CSP, HSTS, X-Frame-Options
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS — allow all origins in development, whitelist in production
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [];

app.use(
  cors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
  })
);

// HTTP Parameter Pollution protection
app.use(hpp());

// Rate limiting (global)
app.use(globalLimiter);

// Body parser with 10kb limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Request logging
app.use(requestLogger);

// API routes
app.use('/api', routes);

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Error handler (must be last)
app.use(errorHandler);

export default app;
