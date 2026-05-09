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

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  email: string | null;
}

interface GitHubEmailEntry {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Initiates GitHub OAuth flow by redirecting to GitHub.
 */
export const githubLogin = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const cookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 15 * 60 * 1000,
    };

    res.cookie('auth_state', state, cookieOptions);
    res.cookie('code_verifier', codeVerifier, cookieOptions);

    const url = await github.createAuthorizationURL(state, ['user:email', 'repo']);

    logger.info({ state }, 'Initiating GitHub OAuth redirect');
    res.redirect(url.toString());
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GitHub OAuth callback — exchanges code for token, upserts user.
 */
export const githubCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { code, state } = req.query;
  const storedState = req.cookies.auth_state as string | undefined;

  if (!state || !storedState || state !== storedState) {
    next(new AuthError('Invalid OAuth state'));
    return;
  }

  if (typeof code !== 'string') {
    next(new AuthError('No authorization code provided'));
    return;
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    res.clearCookie('auth_state');
    res.clearCookie('code_verifier');

    const { data: githubUser } = await axios.get<GitHubUserResponse>(
      'https://api.github.com/user',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const { data: emails } = await axios.get<GitHubEmailEntry[]>(
      'https://api.github.com/user/emails',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const primaryEmail =
      emails.find((e) => e.primary)?.email ?? githubUser.email ?? '';

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
        accessToken,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ userId: user._id, login: user.login }, 'User authenticated successfully');
    res.redirect(`${env.ALLOWED_ORIGINS}/dashboard`);
  } catch (error) {
    logger.error({ error }, 'GitHub OAuth Callback failed');
    next(new AuthError('Authentication flow failed'));
  }
};

/**
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqWithUser = req as Request & { user: { id: string } };
    const user = await User.findById(reqWithUser.user.id).select('-accessToken');
    if (!user) {
      next(new AuthError('User not found'));
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(new DatabaseError('Failed to retrieve user profile'));
  }
};

/**
 * Logs out the user by clearing the session cookie.
 */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
