<<<<<<< HEAD
=======
/**
 * @file src/routes/reviewRoutes.ts
 * @description Review API endpoints for the frontend.
 */

>>>>>>> 828c344 (Save local changes)
import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

<<<<<<< HEAD
// Route to get all reviews
router.get('/', protect, reviewController.getReviews);

// Route to get review statistics
router.get('/stats', protect, reviewController.getReviewStats);

// Route to get a single review by id
router.get('/:id', protect, reviewController.getReviewById);
=======
router.get('/', protect, reviewController.getReviews);
router.get('/:reviewId', protect, reviewController.getReviewById);
>>>>>>> 828c344 (Save local changes)

export default router;
