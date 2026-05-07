/**
 * @file src/models/User.ts
 * @description Mongoose model stub for User (Week 2+: GitHub OAuth).
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  login: string;
  avatarUrl: string;
  accessToken: string; // Encrypted in production
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    accessToken: { type: String, required: true, select: false }, // Excluded by default
  },
  { timestamps: true, collection: 'users' },
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
