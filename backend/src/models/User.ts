/**
 * @file src/models/User.ts
 * @description Mongoose model stub for User (Week 2+: GitHub OAuth).
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  login: string;
  email?: string;
  avatarUrl: string;
  profileUrl: string;
  accessToken: string; // Encrypted in production
  role: 'admin' | 'reviewer' | 'user';
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    login: { type: String, required: true },
    email: { type: String, lowercase: true },
    avatarUrl: { type: String, required: true },
    profileUrl: { type: String, required: true },
    accessToken: { type: String, required: true, select: false }, // Excluded by default
    role: { type: String, enum: ['admin', 'reviewer', 'user'], default: 'user' },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'users' },
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
