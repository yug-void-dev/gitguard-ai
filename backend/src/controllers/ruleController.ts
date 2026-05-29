/**
 * @file src/controllers/ruleController.ts
 * @description Controller for managing repository rule profiles.
 */

import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { RepositoryRule } from '../models/RepositoryRule';
import { clearRuleCache } from '../services/ruleEngine';
import { logger } from '../lib/logger';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

/**
 * List all rule profiles for a repository.
 * GET /api/rules/:repositoryId
 */
export const getRuleProfiles = async (
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

    const profiles = await RepositoryRule.find({ repositoryId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, profiles });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch rule profiles');
    next(error);
  }
};

/**
 * Create a new rule profile.
 * POST /api/rules/:repositoryId
 */
export const createRuleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryId } = req.params;
    const { profileName, spec, isActive } = req.body;

    if (!profileName) {
      res.status(400).json({ success: false, message: 'profileName is required' });
      return;
    }

    const repository = await Repository.findOne({ _id: repositoryId, ownerId: userId });
    if (!repository) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    const existingProfilesCount = await RepositoryRule.countDocuments({ repositoryId });
    const makeActive = existingProfilesCount === 0 || isActive === true;

    if (makeActive) {
      await RepositoryRule.updateMany({ repositoryId }, { isActive: false });
    }

    try {
      const profile = await RepositoryRule.create({
        repositoryId,
        profileName,
        spec,
        isActive: makeActive,
      });

      clearRuleCache(repository.fullName);
      logger.info({ profileId: profile._id, profileName, repositoryId }, 'Rule profile created');

      res.status(201).json({ success: true, profile });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({
          success: false,
          message: `A rule profile with the name '${profileName}' already exists for this repository`,
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    logger.error({ error }, 'Failed to create rule profile');
    next(error);
  }
};

/**
 * Update an existing rule profile spec.
 * PATCH /api/rules/:repositoryId/:profileId
 */
export const updateRuleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryId, profileId } = req.params;
    const { spec } = req.body;

    const repository = await Repository.findOne({ _id: repositoryId, ownerId: userId });
    if (!repository) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    const profile = await RepositoryRule.findOne({ _id: profileId, repositoryId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Rule profile not found' });
      return;
    }

    if (spec) {
      profile.spec = { ...(profile.spec as any).toObject(), ...spec };
      profile.version = (profile.version || 1) + 1;
    }

    await profile.save();
    clearRuleCache(repository.fullName);

    logger.info({ profileId, repositoryId }, 'Rule profile updated');
    res.status(200).json({ success: true, profile });
  } catch (error) {
    logger.error({ error }, 'Failed to update rule profile');
    next(error);
  }
};

/**
 * Delete a rule profile.
 * DELETE /api/rules/:repositoryId/:profileId
 */
export const deleteRuleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryId, profileId } = req.params;

    const repository = await Repository.findOne({ _id: repositoryId, ownerId: userId });
    if (!repository) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    const profile = await RepositoryRule.findOne({ _id: profileId, repositoryId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Rule profile not found' });
      return;
    }

    if (profile.isActive) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete the active rule profile. Please activate another profile first.',
      });
      return;
    }

    await profile.deleteOne();
    clearRuleCache(repository.fullName);

    logger.info({ profileId, repositoryId }, 'Rule profile deleted');
    res.status(200).json({ success: true, message: 'Rule profile deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete rule profile');
    next(error);
  }
};

/**
 * Set a rule profile as active (and deactivate all others for this repository).
 * PATCH /api/rules/:repositoryId/:profileId/activate
 */
export const setActiveProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { repositoryId, profileId } = req.params;

    const repository = await Repository.findOne({ _id: repositoryId, ownerId: userId });
    if (!repository) {
      res.status(404).json({ success: false, message: 'Repository not found' });
      return;
    }

    const profile = await RepositoryRule.findOne({ _id: profileId, repositoryId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Rule profile not found' });
      return;
    }

    // Deactivate all others first
    await RepositoryRule.updateMany({ repositoryId }, { isActive: false });

    profile.isActive = true;
    await profile.save();

    clearRuleCache(repository.fullName);

    logger.info({ profileId, repositoryId }, 'Rule profile activated');
    res.status(200).json({ success: true, profile });
  } catch (error) {
    logger.error({ error }, 'Failed to activate rule profile');
    next(error);
  }
};
