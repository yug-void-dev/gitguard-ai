/**
 * @file src/controllers/analyticsController.ts
 * @description Controller for fetching token usage and analytics data.
 */

import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { logger } from '../lib/logger';

export const getUsageAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          promptTokens: { $sum: "$tokenUsage.promptTokens" },
          completionTokens: { $sum: "$tokenUsage.completionTokens" },
          totalTokens: { $sum: "$tokenUsage.totalTokens" },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate roughly estimated costs (e.g., Llama/Groq averages $0.50 per 1M tokens)
    const costPerMillionTokens = 0.50;
    
    const enrichedUsage = usage.map(day => {
      const estimatedCost = (day.totalTokens / 1_000_000) * costPerMillionTokens;
      return {
        date: day._id,
        promptTokens: day.promptTokens || 0,
        completionTokens: day.completionTokens || 0,
        totalTokens: day.totalTokens || 0,
        reviewCount: day.reviewCount,
        estimatedCostUsd: Number(estimatedCost.toFixed(4))
      };
    });

    const totalCost = enrichedUsage.reduce((acc, day) => acc + day.estimatedCostUsd, 0);
    const totalTokens = enrichedUsage.reduce((acc, day) => acc + day.totalTokens, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalCostUsd: Number(totalCost.toFixed(4)),
        totalTokens,
      },
      data: enrichedUsage
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch usage analytics');
    next(error);
  }
};
