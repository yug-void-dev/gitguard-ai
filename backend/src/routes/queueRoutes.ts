/**
 * @file src/routes/queueRoutes.ts
 * @description Express routes for the BullMQ queue metrics API.
 *
 * Endpoint:
 *   GET /api/queue/metrics  — Returns live queue depth, active/completed/failed counts.
 *   Protected by authMiddleware (JWT required).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getQueueSnapshot } from '../queue/queueMetrics';
import { ApiResponse } from '../types/github';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/queue/metrics
 *
 * Returns a live snapshot of the BullMQ review queue.
 * Used by the Week-4 dashboard to show queue health and throughput.
 *
 * @auth Required (JWT)
 */
router.get(
  '/metrics',
  protect,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const snapshot = await getQueueSnapshot();

      const response: ApiResponse<typeof snapshot> = {
        success: true,
        message: 'Queue metrics retrieved',
        data: snapshot,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve queue metrics');
      next(error);
    }
  },
);

export default router;
