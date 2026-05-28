/**
 * @file src/controllers/reviewController.ts
 * @description Controller for review retrieval and listing.
 */

import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { AppError, DatabaseError, HttpStatus } from '../lib/errors';

const VALID_STATUSES = ['pending', 'completed', 'failed'] as const;
const VALID_SEVERITIES = ['high', 'medium', 'low', 'info'] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const status = req.query.status as string | undefined;
    const repository = (req.query.repository as string | undefined)?.trim();
    const severity = req.query.severity as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const filter: Record<string, unknown> = {};

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }

    if (repository) {
      filter['repository.fullName'] = repository;
    }

    if (severity && (VALID_SEVERITIES as readonly string[]).includes(severity)) {
      filter['findings.severity'] = severity;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i');
      const orConditions: Array<Record<string, unknown>> = [
        { 'repository.fullName': searchRegex },
        { 'repository.owner': searchRegex },
        { 'repository.name': searchRegex },
        { prTitle: searchRegex },
      ];

      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        orConditions.push({ prNumber: numericSearch });
      }

      filter.$or = orConditions;
    }

    const skip = (page - 1) * limit;

    const totalItems = await Review.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      reviews,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    next(new DatabaseError('Failed to fetch reviews'));
  }
};

export const getReviewStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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
          averageScore: { $avg: '$metrics.codeQualityScore' },
        },
      },
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalVulnerabilities: 0,
      averageScore: 0,
    };

    res.status(200).json({ success: true, stats: result });
  } catch (error) {
    next(new DatabaseError('Failed to fetch review stats'));
  }
};

export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const reviewId = req.params.reviewId || req.params.id;

  try {
    const review = await Review.findById(reviewId).lean();

    if (!review) {
      next(new AppError('Review not found', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND'));
      return;
    }

    res.status(200).json({ success: true, review });
  } catch (error) {
    next(new DatabaseError('Failed to fetch review'));
  }
};
