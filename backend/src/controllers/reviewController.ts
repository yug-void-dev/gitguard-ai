import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { logger } from '../lib/logger';

/**
 * GET /api/reviews
 * Fetch all reviews, sorted by creation date descending, with pagination.
 */
export const getReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalItems = await Review.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      reviews,
      totalItems,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch reviews');
    next(error);
  }
};

/**
 * GET /api/reviews/stats
 * Fetch aggregate statistics for all reviews.
 */
export const getReviewStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalVulnerabilities: { $sum: '$metrics.vulnerabilitiesCount' },
          averageScore: { $avg: '$metrics.codeQualityScore' }
        }
      }
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalVulnerabilities: 0,
      averageScore: 0
    };

    res.status(200).json({ success: true, stats: result });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch review stats');
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
