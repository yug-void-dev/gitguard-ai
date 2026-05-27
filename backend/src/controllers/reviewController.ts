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

    const queryObj: any = {};

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      queryObj.status = req.query.status;
    }

    // Filter by repository full name (case insensitive partial match)
    if (req.query.repository) {
      queryObj['repository.fullName'] = { $regex: req.query.repository as string, $options: 'i' };
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      queryObj.createdAt = {};
      if (req.query.dateFrom) {
        queryObj.createdAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        queryObj.createdAt.$lte = new Date(req.query.dateTo as string);
      }
    }

    // Filter by finding severity
    if (req.query.severity) {
      queryObj['findings.severity'] = req.query.severity;
    }

    // General search filter (looks in prTitle, repository.fullName, and summary)
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search as string, $options: 'i' };
      queryObj.$or = [
        { prTitle: searchRegex },
        { 'repository.fullName': searchRegex },
        { summary: searchRegex }
      ];
    }

    const totalItems = await Review.countDocuments(queryObj);
    const totalPages = Math.ceil(totalItems / limit);

    // Support sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const reviews = await Review.find(queryObj)
      .sort(sortObj)
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
