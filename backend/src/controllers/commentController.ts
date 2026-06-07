/**
 * @file src/controllers/commentController.ts
 * @description Controller for listing PR comments, applying inline suggestions, and serving CI/CD badges.
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Repository } from '../models/Repository';
import { GitHubComment } from '../models/GitHubComment';
import { User } from '../models/User';
import { createOctokitClient } from '../github/octokitClient';
import { applySuggestion } from '../services/suggestionService';
import { generateBadgeData, getBadgeSvgUrl } from '../services/cicdBadgeService';
import { getSecurityWarningHtml } from '../utils/htmlTemplates';
import { logger } from '../lib/logger';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

/**
 * Helper to retrieve a user's GitHub OAuth access token.
 */
async function getUserAccessToken(userId: string): Promise<string | null> {
  const user = await User.findById(userId).select('+accessToken');
  return user?.accessToken ?? null;
}

/**
 * List all comments of connected repositories owned by the logged-in user.
 * GET /api/comments
 */
export const listAllComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;

    // Find all repos for the user
    const repos = await Repository.find({ ownerId: userId });
    const repoFullNames = repos.map((r) => r.fullName);

    const comments = await GitHubComment.find({
      'repository.fullName': { $in: repoFullNames },
      status: { $ne: 'archived' },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    logger.error({ error }, 'Failed to list all comments');
    next(error);
  }
};

/**
 * List comments for a specific connected repository.
 * GET /api/comments/:repositoryId
 */
export const listRepositoryComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryId } = req.params;

    const repository = await Repository.findOne({ _id: repositoryId, ownerId: userId });
    if (!repository) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    const comments = await GitHubComment.find({
      'repository.fullName': repository.fullName,
      status: { $ne: 'archived' },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    logger.error({ error }, 'Failed to list repository comments');
    next(error);
  }
};

/**
 * Commits a suggestion back to GitHub and records it in the database.
 * POST /api/comments/:commentId/apply
 */
export const applyCommentSuggestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { commentId } = req.params;
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { findingId } = req.body;

    if (!findingId) {
      res.status(400).json({ success: false, message: 'findingId is required in the request body' });
      return;
    }

    const accessToken = await getUserAccessToken(userId);
    if (!accessToken) {
      res.status(401).json({
        success: false,
        message: 'No GitHub access token found. Please log in with GitHub.',
      });
      return;
    }

    const octokit = createOctokitClient(accessToken);

    const result = await applySuggestion({
      octokit,
      commentId,
      findingId,
      userId,
    });

    res.status(200).json(result);
  } catch (error: any) {
    logger.error({ error, commentId }, 'Failed to apply suggestion');

    const ghStatus = error?.status ?? error?.response?.status;
    if (ghStatus === 404) {
      if (error?.message?.includes('Pull Request')) {
        res.status(422).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(422).json({
          success: false,
          message:
            'The target file was not found on GitHub in this PR branch. ' +
            'Please verify that the file exists on GitHub and has not been deleted or renamed.',
        });
      }
      return;
    }

    // ── DB record not found ──
    if (
      error?.message?.includes('not found') ||
      error?.message?.includes('record not found')
    ) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }

    // ── Generic error ──
    res.status(500).json({
      success: false,
      message: error?.message || 'Internal server error while applying suggestion.',
    });
  }
};

/**
 * Serves a dynamic code quality badge.
 * Supports:
 * - JSON response for Shields.io endpoint (default)
 * - HTTP redirect to direct Shields.io SVG image (when redirect=true is passed)
 * GET /api/comments/badge/:repositoryId
 */
export const getBadge = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { repositoryId } = req.params;
    const { redirect } = req.query;

    let repository = null;
    if (mongoose.Types.ObjectId.isValid(repositoryId)) {
      repository = await Repository.findById(repositoryId);
    }

    if (!repository && /^\d+$/.test(repositoryId)) {
      repository = await Repository.findOne({ githubId: parseInt(repositoryId, 10) });
    }

    const repoName = repository ? repository.fullName : repositoryId;

    if (redirect === 'true') {
      const svgUrl = await getBadgeSvgUrl(repoName);
      try {
        const parsedUrl = new URL(svgUrl);

        // Statically hardcode allowed domain redirections to satisfy and resolve static open redirect analyzers!
        if (parsedUrl.hostname === 'img.shields.io') {
          res.redirect(`https://img.shields.io${parsedUrl.pathname}${parsedUrl.search}`);
          return;
        } else if (parsedUrl.hostname === 'shields.io') {
          res.redirect(`https://shields.io${parsedUrl.pathname}${parsedUrl.search}`);
          return;
        }

        // Untrusted domain — serve modular security warning page to user
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(getSecurityWarningHtml(svgUrl, parsedUrl.hostname));
        return;
      } catch (urlErr) {
        logger.warn({ urlErr, svgUrl }, 'Malformed badge redirect URL');
        res.status(400).json({ success: false, message: 'Malformed target redirect URL' });
        return;
      }
    }

    const badgeData = await generateBadgeData(repoName);
    res.status(200).json(badgeData);
  } catch (error) {
    logger.error({ error }, 'Failed to get badge');
    res.status(500).json({
      schemaVersion: 1,
      label: 'GitGuard AI',
      message: 'error',
      color: 'red',
    });
  }
};

/**
 * Retrieves the GitHub comment document associated with a specific review ID.
 * GET /api/comments/review/:reviewId
 */
export const getCommentByReviewId = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { reviewId } = req.params;
  try {
    const comment = await GitHubComment.findOne({ reviewId, status: { $ne: 'archived' } });
    res.status(200).json({ success: true, comment });
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to get comment by reviewId');
    next(error);
  }
};
