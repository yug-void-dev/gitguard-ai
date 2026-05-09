/**
 * @file src/models/User.ts
 * @description Mongoose model for GitHub OAuth users.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  login: string;
  email: string;
  avatarUrl: string;
  profileUrl: string;
  accessToken: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    githubId:    { type: Number, required: true, unique: true, index: true },
    login:       { type: String, required: true },
    email:       { type: String, default: '' },
    avatarUrl:   { type: String, required: true },
    profileUrl:  { type: String, default: '' },
    accessToken: { type: String, required: true, select: false },
    lastLogin:   { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'users' },
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
