/**
 * @file src/routes/health.ts
 * @description Health check endpoint for load balancers and monitoring.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/** GET /health — liveness + readiness check */
router.get('/', (_req: Request, res: Response): void => {
  const dbState = mongoose.connection.readyState;

  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
    },
  });
});

export default router;
