/**
 * @file src/routes/commentRoutes.ts
 * @description Routes for pull request review comments, inline suggestions, CI/CD badges, and manual triggers.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as commentController from '../controllers/commentController';
import { protect } from '../middlewares/authMiddleware';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { postReviewComment } from '../services/commentService';
import { postInlineSuggestions } from '../services/suggestionService';
import { applyPRLabels } from '../services/labelService';
import { AppError, HttpStatus } from '../lib/errors';
import { logger } from '../lib/logger';
import { PRContext } from '../types/analysis';
import { IReview } from '../models/Review';
import { Octokit } from '@octokit/rest';
import { GitHubComment } from '../models/GitHubComment';

const router = Router();

// --- PUBLIC BADGE ROUTE ---

/**
 * @route   GET /api/comments/badge/:repositoryId
 * @desc    Get CI/CD quality badge data (JSON Shields.io or direct redirect to SVG image)
 * @access  Public (required so Shields.io and GitHub markdown renderers can fetch it)
 */
router.get('/badge/:repositoryId', commentController.getBadge);

// Apply authentication middleware to all other endpoints in this router
router.use(protect);

// --- COMMENT LISTINGS & SUGGESTIONS ACTIONS ---

/**
 * @route   GET /api/comments
 * @desc    List all comments for logged-in user's repositories
 * @access  Private
 */
router.get('/', commentController.listAllComments);

/**
 * @route   GET /api/comments/review/:reviewId
 * @desc    Get comment details for a specific review
 * @access  Private
 */
router.get('/review/:reviewId', commentController.getCommentByReviewId);

/**
 * @route   GET /api/comments/:repositoryId
 * @desc    List comments for a specific repository
 * @access  Private
 */
router.get('/:repositoryId', commentController.listRepositoryComments);

/**
 * @route   POST /api/comments/:commentId/apply
 * @desc    Commit a specific suggestion directly back to GitHub
 * @access  Private
 */
router.post('/:commentId/apply', commentController.applyCommentSuggestion);

// --- MANUAL TRIGGERS & RETRIES ---

/**
 * @route   POST /api/comments/:reviewId/post
 * @desc    Triggers posting the full GitGuard review comment and applying labels to GitHub.
 * @access  Private
 */
router.post(
  '/:reviewId/post',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = logger.child({
      module: 'commentRoutes',
      reviewId: req.params['reviewId'],
    });

    try {
      const review = await Review.findById(req.params['reviewId']);
      if (!review) {
        next(new AppError('Review not found', HttpStatus.NOT_FOUND, 'REVIEW_NOT_FOUND'));
        return;
      }

      const userId = (req as Request & { user: { id: string } }).user.id;
      const user = await User.findById(userId).select('+accessToken');
      if (!user?.accessToken) {
        next(
          new AppError(
            'GitHub token not available — please reconnect',
            HttpStatus.UNAUTHORIZED,
            'NO_GITHUB_TOKEN',
          ),
        );
        return;
      }

      const context = buildPRContext(review);
      const octokit = new Octokit({ auth: user.accessToken });

      // 1. Post primary bot review comment
      const commentDoc = await postReviewComment({
        octokit,
        reviewDoc: review,
        context,
        eventTraceId: review._id?.toString() ?? 'unknown',
      });

      // 2. Post inline suggestion blocks for critical/high issues
      if (commentDoc) {
        await postInlineSuggestions({
          octokit,
          commentDoc,
          findings: review.findings,
          prNumber: review.prNumber,
        });
      }

      // 3. Apply labels
      const labelResult = await applyPRLabels(
        user.accessToken,
        review.repository.owner,
        review.repository.name,
        review.prNumber,
        review.findings,
        review._id?.toString() ?? 'unknown',
      );

      log.info({ labelResult }, 'Manual review posted to GitHub');

      res.status(200).json({
        success: true,
        message: 'Review posted to GitHub successfully',
        data: { commentDoc, labelResult },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/comments/:reviewId/suggest
 * @desc    Posts inline suggestion comments for actionable findings.
 * @access  Private
 */
router.post(
  '/:reviewId/suggest',
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
        next(
          new AppError(
            'GitHub token not available',
            HttpStatus.UNAUTHORIZED,
            'NO_GITHUB_TOKEN',
          ),
        );
        return;
      }

      const octokit = new Octokit({ auth: user.accessToken });

      // Find or create comment doc reference for recording inline suggestions
      let commentDoc = await GitHubComment.findOne({ reviewId: review._id });
      if (!commentDoc) {
        commentDoc = new GitHubComment({
          reviewId: review._id,
          repository: {
            owner: review.repository.owner,
            name: review.repository.name,
            fullName: review.repository.fullName,
          },
          prNumber: review.prNumber,
          prTitle: review.prTitle,
          type: 'review',
          bodyMarkdown: '',
          status: 'pending',
        });
        await commentDoc.save();
      }

      await postInlineSuggestions({
        octokit,
        commentDoc,
        findings: review.findings,
        prNumber: review.prNumber,
      });

      res.status(200).json({
        success: true,
        message: 'Posted inline suggestion(s) successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/comments/:reviewId/labels
 * @desc    Re-applies labels to a PR based on current findings.
 * @access  Private
 */
router.post(
  '/:reviewId/labels',
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
        next(
          new AppError(
            'GitHub token not available',
            HttpStatus.UNAUTHORIZED,
            'NO_GITHUB_TOKEN',
          ),
        );
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

// --- PRIVATE HELPERS ---

function buildPRContext(review: IReview): PRContext {
  return {
    prNumber: review.prNumber,
    title: review.prTitle,
    description: null,
    linkedIssues: [],
    headBranch: 'unknown',
    baseBranch: 'main',
    language: null,
    changedFiles: 0,
    additions: 0,
    deletions: 0,
    isDraft: false,
    repositoryFullName: review.repository.fullName,
    authorLogin: 'unknown',
  };
}

export default router;
