/**
 * @file src/routes/githubRoutes.ts
 * @description Routes for GitHub proxy actions (fetching repos, etc.).
 */

import { Router } from 'express';
import { getGitHubRepos } from '../controllers/repositoryController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Protect all routes in this file
router.use(protect);

/**
 * @route   GET /api/github/repos
 * @desc    Get user's available repositories on GitHub
 */
router.get('/repos', getGitHubRepos);

export default router;
