import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { logger } from '../lib/logger';

/**
 * GET /api/team
 * Fetch all team members.
 */
export const getTeamMembers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password -accessToken')
      .sort({ createdAt: -1 });

    // Map to match the frontend expected format
    const members = users.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.login || user.email.split('@')[0],
      role: user.role || 'viewer',
      joinedDate: user.createdAt,
    }));

    res.status(200).json({ success: true, members });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch team members');
    next(error);
  }
};

/**
 * POST /api/team/members
 * Add a new team member.
 */
export const addTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    const newUser = new User({
      email,
      login: email.split('@')[0], // Default login to part of email
      role: role || 'viewer',
    });

    await newUser.save();
    res.status(201).json({ success: true, member: newUser });
  } catch (error) {
    logger.error({ error }, 'Failed to add team member');
    next(error);
  }
};

/**
 * PATCH /api/team/members/:id
 * Update a team member's role.
 */
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, member: user });
  } catch (error) {
    logger.error({ error }, 'Failed to update member role');
    next(error);
  }
};

/**
 * DELETE /api/team/members/:id
 * Remove a team member.
 */
export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (error) {
    logger.error({ error }, 'Failed to remove member');
    next(error);
  }
};
