/**
 * @file src/routes/commentRoutes.ts
 * @description Routes for pull request review comments, inline suggestions, and CI/CD badges.
 */

import { Router } from 'express';
import * as commentController from '../controllers/commentController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @route   GET /api/comments/badge/:repositoryId
 * @desc    Get CI/CD quality badge data (JSON Shields.io or direct redirect to SVG image)
 * @access  Public (required so Shields.io and GitHub markdown renderers can fetch it)
 */
router.get('/badge/:repositoryId', commentController.getBadge);

// Apply authentication middleware to all other endpoints in this router
router.use(protect);

/**
 * @route   GET /api/comments
 * @desc    List all comments for logged-in user's repositories
 * @access  Private
 */
router.get('/', commentController.listAllComments);

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

export default router;
