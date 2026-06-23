/**
 * @file src/routes/analyticsRoutes.ts
 * @description Express routes for analytics.
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { getUsageAnalytics } from '../controllers/analyticsController';

const router = Router();

// Protect routes
router.use(requireAuth);

router.get('/usage', getUsageAnalytics);

export default router;
