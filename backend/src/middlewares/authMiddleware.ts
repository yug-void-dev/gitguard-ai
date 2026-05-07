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

/**
 * Protects routes by verifying the 'token' cookie.
 * Injects user ID into the request object for downstream use.
 */
export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new AuthError('Not authorized, please login'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as any).user = { id: decoded.id };
    next();
  } catch (error) {
    next(new AuthError('Not authorized, token failed'));
  }
};
