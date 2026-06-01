/**
 * @file src/controllers/authController.ts
 * @description Controller for GitHub OAuth and session management.
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { generateState, generateCodeVerifier } from 'arctic';
import crypto from 'crypto';
import { env } from '../config/env';
import { github } from '../lib/arctic';
import { User } from '../models/User';
import { logger } from '../lib/logger';
import { AuthError, DatabaseError } from '../lib/errors';
import * as mailService from '../services/mailService';

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
    const firstOrigin = env.ALLOWED_ORIGINS.split(',')[0].trim();
    // Append gh_login=1 so the frontend can detect a GitHub OAuth arrival and show a toast
    res.redirect(`${firstOrigin}/dashboard?gh_login=1`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'GitHub OAuth Callback failed');
    next(new AuthError(`Authentication flow failed: ${msg}`));
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
  const { login, email, password } = req.body;
  const loginIdentifier = login || email;

  try {
    const user = await User.findOne({ 
      $or: [{ email: loginIdentifier }, { login: loginIdentifier }] 
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
      token,
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

/**
 * Initiates the forgot password flow by generating and emailing a 6-digit OTP.
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email } = req.body;

  try {
    if (!email) {
      next(new AuthError('Email address is required'));
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Security practice: do not leak if email exists or not
      // Simply return success response so attackers can't scrape emails
      res.status(200).json({
        success: true,
        message: 'If the email matches a registered account, an OTP has been sent.',
      });
      return;
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before storing it
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    // Construct security metadata for audit log in the email
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';
    // Clean up IPv6 loopback or proxy formatting if present
    const ip = rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp === '::1' ? '127.0.0.1' : rawIp;
    const userAgent = req.headers['user-agent'] || 'Unknown Client';
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }) + ' UTC';

    // Send the email
    const previewUrl = await mailService.sendOtpEmail(user.email, user.login, otp, {
      ip,
      userAgent,
      timestamp,
    });

    res.status(200).json({
      success: true,
      message: 'If the email matches a registered account, an OTP has been sent.',
      ...(previewUrl ? { previewUrl } : {}), // For testing/dev purposes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies if the user-supplied OTP is valid and not expired.
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      next(new AuthError('Email and OTP code are required'));
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      next(new AuthError('Invalid email or OTP code'));
      return;
    }

    // Check expiration
    if (new Date() > user.resetPasswordOtpExpires) {
      next(new AuthError('OTP code has expired'));
      return;
    }

    // Hash user-submitted OTP to compare with DB
    const hashedSubmittedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedSubmittedOtp !== user.resetPasswordOtp) {
      next(new AuthError('Invalid email or OTP code'));
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resets the password using the OTP verification.
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email, otp, password } = req.body;

  try {
    if (!email || !otp || !password) {
      next(new AuthError('Email, OTP, and new password are required'));
      return;
    }

    if (password.length < 8) {
      next(new AuthError('Password must be at least 8 characters long'));
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      next(new AuthError('Invalid request or OTP code'));
      return;
    }

    // Check expiration
    if (new Date() > user.resetPasswordOtpExpires) {
      next(new AuthError('OTP code has expired'));
      return;
    }

    // Check OTP match
    const hashedSubmittedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedSubmittedOtp !== user.resetPasswordOtp) {
      next(new AuthError('Invalid request or OTP code'));
      return;
    }

    // Success: update password and clear OTP fields
    user.password = password; // pre-save hook will hash it
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
