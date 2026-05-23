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
      emails.find((e) => e.primary && e.verified)?.email ??
      emails.find((e) => e.primary)?.email ??
      githubUser.email ??
      '';

    /**
     * Use a single atomic upsert so we NEVER hit the duplicate-key error.
     *
     * Search criteria:  githubId match  OR  login match (handles the case
     * where a user was previously created via another path without a githubId,
     * or where githubId wasn't stored on first attempt).
     *
     * $setOnInsert only runs when a new doc is created; $set always runs.
     * runValidators: false avoids spurious validation on partial updates.
     */
    const user = await User.findOneAndUpdate(
      {
        $or: [
          { githubId: githubUser.id },
          { login: githubUser.login },
        ],
      },
      {
        $set: {
          githubId:   githubUser.id,
          login:      githubUser.login,
          avatarUrl:  githubUser.avatar_url,
          profileUrl: githubUser.html_url,
          accessToken,
          lastLogin:  new Date(),
          ...(primaryEmail ? { email: primaryEmail } : {}),
        },
        $setOnInsert: {
          ...(primaryEmail ? {} : { email: `${githubUser.login}@users.noreply.github.com` }),
        },
      },
      {
        upsert:          true,
        new:             true,   // return the updated / newly created doc
        runValidators:   false,  // skip validators on partial updates
        select:          '+accessToken',
      },
    );

    if (!user) {
      next(new AuthError('Failed to create or update user'));
      return;
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
  } catch (error: any) {
    logger.error({ error }, 'GitHub OAuth Callback failed');
    next(new AuthError(`Authentication flow failed: ${error.message || error}`));
  }
};

/**
 * Registers a new user with email and password.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { login, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { login }] });
    if (existingUser) {
      next(new AuthError('User with this email or username already exists'));
      return;
    }

    const user = await User.create({
      login,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please log in.',
      user: {
        id: user._id,
        login: user.login,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticates a user with email/username and password.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { login, password } = req.body;

  try {
    const user = await User.findOne({ 
      $or: [{ email: login }, { login }] 
    }).select('+password');

    if (!user || !user.password) {
      next(new AuthError('Invalid credentials'));
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      next(new AuthError('Invalid credentials'));
      return;
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

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        login: user.login,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
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
    const user = await User.findById(reqWithUser.user.id);
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
