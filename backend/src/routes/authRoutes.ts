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
 * @route   POST /api/auth/register
 * @desc    Register new user
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 */
router.post('/login', authController.login);

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

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset OTP
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify password reset OTP
 */
router.post('/verify-otp', authController.verifyOtp);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using OTP
 */
router.post('/reset-password', authController.resetPassword);

export default router;
