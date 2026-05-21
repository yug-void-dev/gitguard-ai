import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { logger } from '../lib/logger';

/**
 * GET /api/reviews
 * Fetch all reviews, sorted by creation date descending.
 */
export const getReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch reviews');
    next(error);
  }
};

/**
 * GET /api/reviews/:id
 * Fetch a single review by its ID.
 */
export const getReviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }
    res.status(200).json({ success: true, review });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch review');
    next(error);
  }
};
