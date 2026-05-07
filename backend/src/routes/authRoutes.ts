/**
 * @file src/routes/authRoutes.ts
 * @description Routes for GitHub OAuth and session management.
 */

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth
 */
router.get('/github', authController.githubLogin);

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth Callback
 */
router.get('/github/callback', authController.githubCallback);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (Protected)
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 */
router.post('/logout', authController.logout);

export default router;
