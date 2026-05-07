/**
 * @file src/controllers/authController.ts
 * @description Controller for GitHub OAuth and session management.
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { generateState, generateCodeVerifier } from 'arctic';
import { env } from '../config/env';
import { github } from '../lib/arctic';
import { User } from '../models/User';
import { logger } from '../lib/logger';
import { AuthError, DatabaseError } from '../lib/errors';

/**
 * Initiates GitHub OAuth flow by redirecting to GitHub.
 * Generates security parameters (state, codeVerifier) and stores them in cookies.
 */
export const githubLogin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store security parameters in cookies for validation in callback
    const cookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 15 * 60 * 1000, // 15 minutes
    };

    res.cookie('auth_state', state, cookieOptions);
    res.cookie('code_verifier', codeVerifier, cookieOptions);

    // Create Authorization URL using Arctic (v3.x signature)
    const url = await github.createAuthorizationURL(state, ['user:email', 'repo']);

    logger.info({ state }, 'Initiating GitHub OAuth redirect');
    res.redirect(url.toString());
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GitHub OAuth callback, exchanges code for tokens, and creates/updates user.
 */
export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
  const { code, state } = req.query;
  const storedState = req.cookies.auth_state;
  // storedCodeVerifier is currently unused by Arctic v3 GitHub provider

  // Validate state (CSRF Protection)
  if (!state || !storedState || state !== storedState) {
    return next(new AuthError('Invalid OAuth state'));
  }

  // Validate code (OAuth requirement)
  if (typeof code !== 'string') {
    return next(new AuthError('No authorization code provided'));
  }

  try {
    // Exchange code for tokens using Arctic (v3.x signature)
    const tokens = await github.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    // Clear security cookies
    res.clearCookie('auth_state');
    res.clearCookie('code_verifier');

    // Fetch user profile from GitHub
    const { data: githubUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Fetch primary email
    const { data: emails } = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email;

    // Synchronize user in MongoDB
    let user = await User.findOne({ githubId: githubUser.id }).select('+accessToken');

    if (user) {
      user.accessToken = accessToken;
      user.lastLogin = new Date();
      await user.save();
    } else {
      user = await User.create({
        githubId: githubUser.id,
        login: githubUser.login,
        email: primaryEmail,
        avatarUrl: githubUser.avatar_url,
        profileUrl: githubUser.html_url,
        accessToken: accessToken,
      });
    }

    // Generate app session JWT
    const token = jwt.sign(
      { id: user._id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Set JWT cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info({ userId: user._id, login: user.login }, 'User authenticated successfully');
    res.redirect(`${env.ALLOWED_ORIGINS}/dashboard`);
  } catch (error) {
    logger.error({ error }, 'GitHub OAuth Callback failed');
    next(new AuthError('Authentication flow failed'));
  }
};

/**
 * Retrieves the currently authenticated user's profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById((req as any).user.id).select('-accessToken');
    if (!user) {
      return next(new AuthError('User not found'));
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(new DatabaseError('Failed to retrieve user profile'));
  }
};

/**
 * Logs out the user by clearing the session cookie.
 */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
