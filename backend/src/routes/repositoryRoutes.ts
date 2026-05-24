/**
 * @file src/routes/repositoryRoutes.ts
 * @description Routes for managing repositories connected to GitGuard AI.
 */

import { Router } from 'express';
import * as repositoryController from '../controllers/repositoryController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Protect all routes in this file
router.use(protect);

/**
 * @route   GET /api/repositories
 * @desc    Get connected repositories
 */
router.get('/', repositoryController.getRepositories);

/**
 * @route   POST /api/repositories/connect
 * @desc    Connect a new GitHub repository
 */
router.post('/connect', repositoryController.connectRepository);

/**
 * @route   PATCH /api/repositories/:id
 * @desc    Update repository (toggle isActive, reviewMode, ignorePatterns)
 */
router.patch('/:id', repositoryController.updateRepository);

/**
 * @route   PATCH /api/repositories/:id/rules
 * @desc    Update repository analysis rules
 */
router.patch('/:id/rules', repositoryController.updateRepositoryRules);

/**
 * @route   DELETE /api/repositories/:id
 * @desc    Disconnect repository
 */
router.delete('/:id', repositoryController.disconnectRepository);

export default router;
