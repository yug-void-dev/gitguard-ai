/**
 * @file src/models/User.ts
 * @description Mongoose model for GitHub OAuth users.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  githubId?: number;
  login: string;
  email: string;
  password?: string;
  avatarUrl: string;
  profileUrl?: string;
  accessToken?: string;
  lastLogin: Date;
  resetPasswordOtp?: string;
  resetPasswordOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    githubId:    { type: Number, unique: true, sparse: true, index: true },
    login:       { type: String, required: true, unique: true },
    email:       { type: String, required: true, unique: true },
    password:    { type: String, select: false },
    avatarUrl:   { type: String, default: 'https://github.com/identicons/jedi.png' },
    profileUrl:  { type: String, default: '' },
    accessToken: { type: String, select: false },
    lastLogin:   { type: Date, default: Date.now },
    resetPasswordOtp:        { type: String },
    resetPasswordOtpExpires: { type: Date },
  },
  { timestamps: true, collection: 'users' },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password!);
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
