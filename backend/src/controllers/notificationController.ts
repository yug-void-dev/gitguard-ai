import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../lib/logger';

/**
 * GET /api/notifications
 * Fetch recent audit logs to serve as notifications.
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await AuditLog.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch notifications');
    next(error);
  }
};
