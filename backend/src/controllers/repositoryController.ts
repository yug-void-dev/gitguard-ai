/**
 * @file src/controllers/repositoryController.ts
 * @description CRUD endpoints for repositories connected to GitGuard AI.
 *
 *   GET    /api/repositories          → list connected repos for the logged-in user
 *   POST   /api/repositories/connect  → connect a new repo (save + install webhook)
 *   PATCH  /api/repositories/:id      → toggle isActive
 *   PATCH  /api/repositories/:id/rules → update review rules
 *   DELETE /api/repositories/:id      → disconnect repo (remove webhook + delete doc)
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Repository } from '../models/Repository';
import { User } from '../models/User';
import { logger } from '../lib/logger';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

// ─── Helper: get the GitHub access token for the current user ────────────────

async function getUserAccessToken(userId: string): Promise<string | null> {
  const user = await User.findById(userId).select('+accessToken');
  return user?.accessToken ?? null;
}

// ─── Normalize DB doc → frontend ConnectedRepo shape ────────────────────────

function toConnectedRepo(doc: InstanceType<typeof Repository>) {
  return {
    _id: doc._id,
    repositoryFullName: doc.fullName,
    repositoryId: doc.githubId,
    ownerId: doc.ownerId,
    rules: doc.rules,
    webhookId: doc.webhookId,
    isActive: doc.isActive,
    // expose review mode and ignore patterns for settings modal
    reviewMode: doc.reviewMode,
    ignorePatterns: doc.ignorePatterns,
    isPrivate: doc.isPrivate,
    defaultBranch: doc.defaultBranch,
    language: doc.language,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── GET /api/repositories ───────────────────────────────────────────────────

export const getRepositories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const repos = await Repository.find({ ownerId: userId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      repos: repos.map(toConnectedRepo),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch repositories');
    next(error);
  }
};

// ─── POST /api/repositories/connect ─────────────────────────────────────────

export const connectRepository = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryFullName, repositoryId } = req.body as {
      repositoryFullName: string;
      repositoryId: number;
    };

    if (!repositoryFullName || !repositoryId) {
      res.status(400).json({
        success: false,
        message: 'repositoryFullName and repositoryId are required',
      });
      return;
    }

    // Prevent duplicate connections
    const existing = await Repository.findOne({ githubId: repositoryId, ownerId: userId });
    if (existing) {
      res.status(409).json({ success: false, message: 'Repository already connected' });
      return;
    }

    // Optionally install a GitHub webhook
    let webhookId: number | undefined;
    const accessToken = await getUserAccessToken(userId);

    if (accessToken) {
      try {
        const webhookUrl = `${process.env.WEBHOOK_URL || process.env.API_BASE_URL}/api/webhooks/github`;
        const [owner, repo] = repositoryFullName.split('/');
        const { data: hook } = await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/hooks`,
          {
            name: 'web',
            active: true,
            events: ['pull_request'],
            config: {
              url: webhookUrl,
              content_type: 'json',
              secret: process.env.GITHUB_WEBHOOK_SECRET,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
            },
          },
        );
        webhookId = hook.id;
      } catch (hookError) {
        logger.warn({ hookError }, 'Failed to install webhook — continuing without it');
      }
    }

    const repo = await Repository.create({
      githubId: repositoryId,
      fullName: repositoryFullName,
      ownerId: userId,
      webhookId,
    });

    logger.info({ repoId: repo._id, repositoryFullName }, 'Repository connected');
    res.status(201).json({ success: true, repo: toConnectedRepo(repo) });
  } catch (error) {
    logger.error({ error }, 'Failed to connect repository');
    next(error);
  }
};

// ─── PATCH /api/repositories/:id ─────────────────────────────────────────────

export const updateRepository = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { id } = req.params;
    const { isActive, reviewMode, ignorePatterns } = req.body as {
      isActive?: boolean;
      reviewMode?: string;
      ignorePatterns?: string[];
    };

    const repo = await Repository.findOne({ _id: id, ownerId: userId });
    if (!repo) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    if (typeof isActive === 'boolean') repo.isActive = isActive;
    if (reviewMode) repo.reviewMode = reviewMode as typeof repo.reviewMode;
    if (Array.isArray(ignorePatterns)) repo.ignorePatterns = ignorePatterns;

    await repo.save();
    res.status(200).json({ success: true, repo: toConnectedRepo(repo) });
  } catch (error) {
    logger.error({ error }, 'Failed to update repository');
    next(error);
  }
};

// ─── PATCH /api/repositories/:id/rules ───────────────────────────────────────

export const updateRepositoryRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { id } = req.params;
    const { rules } = req.body as { rules: Partial<typeof Repository.prototype.rules> };

    const repo = await Repository.findOne({ _id: id, ownerId: userId });
    if (!repo) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    // Merge partial rules
    if (rules) {
      Object.assign(repo.rules, rules);
      repo.markModified('rules');
    }

    await repo.save();
    res.status(200).json({ success: true, repo: toConnectedRepo(repo) });
  } catch (error) {
    logger.error({ error }, 'Failed to update repository rules');
    next(error);
  }
};

// ─── DELETE /api/repositories/:id ────────────────────────────────────────────

export const disconnectRepository = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { id } = req.params;

    const repo = await Repository.findOne({ _id: id, ownerId: userId });
    if (!repo) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    // Optionally remove the GitHub webhook
    if (repo.webhookId) {
      const accessToken = await getUserAccessToken(userId);
      if (accessToken) {
        const [owner, repoName] = repo.fullName.split('/');
        try {
          await axios.delete(
            `https://api.github.com/repos/${owner}/${repoName}/hooks/${repo.webhookId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
              },
            },
          );
        } catch (hookError) {
          logger.warn({ hookError }, 'Failed to remove webhook — continuing with deletion');
        }
      }
    }

    await repo.deleteOne();
    logger.info({ repoId: id }, 'Repository disconnected');
    res.status(200).json({ success: true, message: 'Repository disconnected' });
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect repository');
    next(error);
  }
};
