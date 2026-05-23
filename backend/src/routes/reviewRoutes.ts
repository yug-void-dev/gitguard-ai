import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Route to get all reviews
router.get('/', protect, reviewController.getReviews);

// Route to get review statistics
router.get('/stats', protect, reviewController.getReviewStats);

// Route to get a single review by id
router.get('/:id', protect, reviewController.getReviewById);

export default router;
