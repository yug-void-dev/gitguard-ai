import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Get all notifications
router.get('/', protect, notificationController.getNotifications);

// Clear all notifications
router.delete('/', protect, notificationController.clearAllNotifications);

// Dismiss a single notification
router.delete('/:id', protect, notificationController.dismissNotification);

export default router;
