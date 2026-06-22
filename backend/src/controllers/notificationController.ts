import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { NotificationSettings } from '../models/NotificationSettings';
import { logger } from '../lib/logger';

/**
 * GET /api/notifications
 * Fetch recent audit logs to serve as notifications.
 */
export const getNotifications = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const notifications = await AuditLog.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch notifications');
    next(error);
  }
};

/**
 * DELETE /api/notifications
 * Delete all audit-log notifications for the current user session.
 */
export const clearAllNotifications = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuditLog.deleteMany({});
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    logger.error({ error }, 'Failed to clear all notifications');
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification by its audit-log id.
 */
export const dismissNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await AuditLog.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    logger.error({ error }, 'Failed to dismiss notification');
    next(error);
  }
};

/**
 * GET /api/notifications/settings
 * Fetch notification settings for the authenticated user.
 */
export const getSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as any; // AuthenticatedRequest
    let settings = await NotificationSettings.findOne({ userId: authReq.user.id });
    if (!settings) {
      settings = await NotificationSettings.create({ userId: authReq.user.id });
    }
    res.status(200).json(settings);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch notification settings');
    next(error);
  }
};

/**
 * PUT /api/notifications/settings
 * Update notification settings.
 */
export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as any;
    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: authReq.user.id },
      { $set: req.body },
      { new: true, upsert: true },
    );
    res.status(200).json(settings);
  } catch (error) {
    logger.error({ error }, 'Failed to update notification settings');
    next(error);
  }
};
