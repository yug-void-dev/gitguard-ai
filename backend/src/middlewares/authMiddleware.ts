/**
 * @file src/middlewares/authMiddleware.ts
 * @description Middleware to protect routes and verify JWT sessions.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthError } from '../lib/errors';
import { User } from '../models/User';

interface JwtPayload {
  id: string;
}

/** Augmented request type carrying the decoded user ID */
interface AuthenticatedRequest extends Request {
  user: { id: string };
}

/**
 * Protects routes by verifying the 'token' cookie.
 * Injects user.id into the request object for downstream handlers.
 */
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  let token = (req.cookies as Record<string, string | undefined>).token;

  // Fallback to Bearer token in Authorization header if cookie is not present
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    next(new AuthError('Not authorized, please login'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = { id: decoded.id };
    next();
  } catch (error) {
    next(new AuthError('Not authorized, token failed'));
  }
};

/**
 * Restricts access to specific roles.
 * Must be used AFTER the `protect` middleware.
 */
export const restrictTo = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await User.findById(authReq.user.id);

      if (!user) {
        next(new AuthError('User no longer exists'));
        return;
      }

      if (!roles.includes(user.role)) {
        res
          .status(403)
          .json({
            success: false,
            message: `Role ${user.role} is not authorized to access this route`,
          });
        return;
      }

      next();
    } catch (error) {
      next(new AuthError('Authorization failed'));
    }
  };
};
