import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Route to get all notifications
router.get('/', protect, notificationController.getNotifications);

export default router;
