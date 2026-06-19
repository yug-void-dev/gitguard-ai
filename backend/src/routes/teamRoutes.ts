import { Router } from 'express';
import * as teamController from '../controllers/teamController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

// Protect all team routes
router.use(protect);

router.get('/', teamController.getTeamMembers);

// Only admins can modify the team
router.post('/members', restrictTo('admin'), teamController.addTeamMember);
router.patch('/members/:id', restrictTo('admin'), teamController.updateMemberRole);
router.delete('/members/:id', restrictTo('admin'), teamController.removeMember);

export default router;
