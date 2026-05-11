/**
 * @file src/app.ts
 * @description Express application factory.
 *
 * Separated from server.ts so we can import the app in tests
 * without starting a real HTTP server or connecting to MongoDB.
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, isProduction } from './config/env';
import { requestIdMiddleware } from './middlewares/requestId';
import { requestLogger } from './middlewares/requestLogger';
import { globalErrorHandler, notFoundHandler } from './middlewares/errorHandler';
import cookieParser from 'cookie-parser';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';
import authRoutes from './routes/authRoutes';
import queueRoutes from './routes/queueRoutes';

/**
 * Creates and configures the Express application.
 * Does NOT start listening — that happens in server.ts.
 */
export function createApp(): Application {
  const app = express();

  // ── 1. Trust proxy (for correct IP behind load balancers) ────────────
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // ── 2. Security headers (Helmet) ─────────────────────────────────────
  // Helmet sets sensible defaults for security-related HTTP headers.
  // See: https://helmetjs.github.io/
  app.use(
    helmet({
      contentSecurityPolicy: isProduction,
      crossOriginEmbedderPolicy: isProduction,
    }),
  );

  // ── 3. Cookies ────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── 4. CORS ───────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, GitHub webhooks)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ['GET', 'POST'],
      allowedHeaders: [
        'Content-Type',
        'X-Hub-Signature-256',
        'X-GitHub-Event',
        'X-GitHub-Delivery',
        'X-Request-ID',
      ],
      exposedHeaders: ['X-Request-ID'],
      credentials: true, // Required for JWT cookies
    }),
  );

  // ── 4. Request ID (must be before logger) ────────────────────────────
  app.use(requestIdMiddleware);

  // ── 5. Request logging ───────────────────────────────────────────────
  app.use(requestLogger);

  // ── 6. Routes ────────────────────────────────────────────────────────
  // Note: webhook routes have their OWN body parser (rawBodyJsonParser)
  // applied at the route level. We intentionally do NOT apply
  // express.json() globally here to preserve req.rawBody integrity.

  app.use('/health', healthRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // Auth routes (Apply JSON parser only here to avoid conflict with webhooks)
  app.use('/api/auth', express.json(), authRoutes);

  // Queue metrics route (authenticated)
  app.use('/api/queue', express.json(), queueRoutes);

  // ── 7. 404 handler ───────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── 8. Global error handler (must be LAST) ───────────────────────────
  app.use(globalErrorHandler);

  return app;
}
