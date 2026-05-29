/**
 * @file src/routes/reviewRoutes.ts
 * @description Review API endpoints for the frontend dashboard.
 */

import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Get all reviews (with optional pagination/filters)
router.get('/', protect, reviewController.getReviews);

// Get review statistics
router.get('/stats', protect, reviewController.getReviewStats);

// Get a single review by ID
router.get('/:reviewId', protect, reviewController.getReviewById);

export default router;
