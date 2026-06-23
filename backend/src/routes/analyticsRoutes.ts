/**
 * @file src/routes/analyticsRoutes.ts
 * @description Express routes for analytics.
 */

import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getUsageAnalytics } from '../controllers/analyticsController';

const router = Router();

// Protect routes
router.use(protect);

router.get('/usage', getUsageAnalytics);

export default router;
