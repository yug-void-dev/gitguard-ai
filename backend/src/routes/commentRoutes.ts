/**
 * @file src/routes/commentRoutes.ts
 * @description REST endpoints for triggering GitHub comment and label operations.
 *
 * POST /api/comments/:reviewId/post    — post full review comment + labels
 * POST /api/comments/:reviewId/suggest — post one-click suggestion comments only
 * DELETE /api/comments/:reviewId       — dismiss (delete) the GitGuard summary comment
 */

import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { postReviewComment } from '../services/commentService';
import { applyPRLabels } from '../services/labelService';
import { postSuggestions } from '../services/suggestionService';
import { AppError, HttpStatus } from '../lib/errors';
import { logger } from '../lib/logger';
import { PRContext } from '../types/analysis';
import { IFinding, IReview } from '../models/Review';

const router = Router();

// ─── POST /api/comments/:reviewId/post ───────────────────────────────────────

/**
 * Triggers posting the full GitGuard review comment to GitHub.
 * Also applies labels to the PR.
 *
 * Body (optional): { headSha?: string }
 */
router.post(
  '/:reviewId/post',
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = logger.child({ module: 'commentRoutes', reviewId: req.params['reviewId'] });

    try {
      const review = await Review.findById(req.params['reviewId']);
      if (!review) {
        next(new AppError('Review not found', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND'));
        return;
      }

      const userId = (req as Request & { user: { id: string } }).user.id;
      const user = await User.findById(userId).select('+accessToken');
      if (!user?.accessToken) {
        next(new AppError('GitHub token not available — please reconnect', HttpStatus.UNAUTHORIZED, 'NO_GITHUB_TOKEN'));
        return;
      }

      const headSha = (req.body as { headSha?: string }).headSha ?? '';
      if (!headSha) {
        next(new AppError('headSha is required to post inline comments', HttpStatus.BAD_REQUEST, 'MISSING_HEAD_SHA'));
        return;
      }

      const context = buildPRContext(review);
      const findings: IFinding[] = review.findings;

      // Post comments
      const commentResult = await postReviewComment({
        token: user.accessToken,
        owner: review.repository.owner,
        repo: review.repository.name,
        prNumber: review.prNumber,
        headSha,
        findings,
        context,
        metrics: review.metrics,
        eventId: review._id?.toString() ?? 'unknown',
      });

      // Apply labels
      const labelResult = await applyPRLabels(
        user.accessToken,
        review.repository.owner,
        review.repository.name,
        review.prNumber,
        findings,
        review._id?.toString() ?? 'unknown',
      );

      log.info({ commentResult, labelResult }, 'Review posted to GitHub');

      res.status(200).json({
        success: true,
        message: 'Review posted to GitHub successfully',
        data: { commentResult, labelResult },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── POST /api/comments/:reviewId/suggest ────────────────────────────────────

/**
 * Posts only the one-click suggestion comments for actionable findings.
 * Lighter-weight than /post — useful for re-triggering suggestions.
 *
 * Body: { headSha: string }
 */
router.post(
  '/:reviewId/suggest',
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const review = await Review.findById(req.params['reviewId']);
      if (!review) {
        next(new AppError('Review not found', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND'));
        return;
      }

      const userId = (req as Request & { user: { id: string } }).user.id;
      const user = await User.findById(userId).select('+accessToken');
      if (!user?.accessToken) {
        next(new AppError('GitHub token not available', HttpStatus.UNAUTHORIZED, 'NO_GITHUB_TOKEN'));
        return;
      }

      const headSha = (req.body as { headSha?: string }).headSha ?? '';
      if (!headSha) {
        next(new AppError('headSha is required', HttpStatus.BAD_REQUEST, 'MISSING_HEAD_SHA'));
        return;
      }

      const result = await postSuggestions({
        token: user.accessToken,
        owner: review.repository.owner,
        repo: review.repository.name,
        prNumber: review.prNumber,
        headSha,
        findings: review.findings,
        eventId: review._id?.toString() ?? 'unknown',
      });

      res.status(200).json({
        success: true,
        message: `Posted ${result.suggestionsPosted} one-click suggestion(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── POST /api/comments/:reviewId/labels ─────────────────────────────────────

/**
 * Re-applies labels to a PR based on current findings.
 * Useful if labels were manually removed.
 */
router.post(
  '/:reviewId/labels',
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const review = await Review.findById(req.params['reviewId']);
      if (!review) {
        next(new AppError('Review not found', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND'));
        return;
      }

      const userId = (req as Request & { user: { id: string } }).user.id;
      const user = await User.findById(userId).select('+accessToken');
      if (!user?.accessToken) {
        next(new AppError('GitHub token not available', HttpStatus.UNAUTHORIZED, 'NO_GITHUB_TOKEN'));
        return;
      }

      const result = await applyPRLabels(
        user.accessToken,
        review.repository.owner,
        review.repository.name,
        review.prNumber,
        review.findings,
        review._id?.toString() ?? 'unknown',
      );

      res.status(200).json({
        success: true,
        message: `Applied ${result.labelsApplied.length} label(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPRContext(review: IReview): PRContext {
  // Reconstruct minimal PRContext from the stored review document
  return {
    prNumber:           review!.prNumber,
    title:              review!.prTitle,
    description:        null,
    linkedIssues:       [],
    headBranch:         'unknown',
    baseBranch:         'main',
    language:           null,
    changedFiles:       0,
    additions:          0,
    deletions:          0,
    isDraft:            false,
    repositoryFullName: review!.repository.fullName,
    authorLogin:        'unknown',
  };
}

export default router;
