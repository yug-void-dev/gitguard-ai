/**
 * @file src/middlewares/authMiddleware.ts
 * @description Middleware to protect routes and verify JWT sessions.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthError } from '../lib/errors';

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
  const token = (req.cookies as Record<string, string | undefined>).token;

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
