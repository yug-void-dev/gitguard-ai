/**
 * @file src/routes/ruleRoutes.ts
 * @description Routes for managing repository rule profiles.
 */

import { Router } from 'express';
import * as ruleController from '../controllers/ruleController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/rules/:repositoryId
 * @desc    List all rule profiles for a repository
 */
router.get('/:repositoryId', ruleController.getRuleProfiles);

/**
 * @route   POST /api/rules/:repositoryId
 * @desc    Create a new rule profile
 */
router.post('/:repositoryId', ruleController.createRuleProfile);

/**
 * @route   PATCH /api/rules/:repositoryId/:profileId
 * @desc    Update an existing rule profile spec
 */
router.patch('/:repositoryId/:profileId', ruleController.updateRuleProfile);

/**
 * @route   DELETE /api/rules/:repositoryId/:profileId
 * @desc    Delete a rule profile
 */
router.delete('/:repositoryId/:profileId', ruleController.deleteRuleProfile);

/**
 * @route   PATCH /api/rules/:repositoryId/:profileId/activate
 * @desc    Set a rule profile as active
 */
router.patch('/:repositoryId/:profileId/activate', ruleController.setActiveProfile);

export default router;
