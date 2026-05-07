/**
 * @file src/models/Repository.ts
 * @description Mongoose model stub for Repository (Week 2+: repo configuration).
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReviewMode = 'full' | 'security-only' | 'strict' | 'off';

export interface IRepository extends Document {
  githubId: number;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  reviewMode: ReviewMode;
  ignorePatterns: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const repositorySchema = new Schema<IRepository>(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true, index: true },
    isPrivate: { type: Boolean, default: false },
    defaultBranch: { type: String, default: 'main' },
    language: { type: String, default: null },
    reviewMode: {
      type: String,
      enum: ['full', 'security-only', 'strict', 'off'],
      default: 'full',
    },
    ignorePatterns: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'repositories' },
);

export const Repository: Model<IRepository> = mongoose.model<IRepository>(
  'Repository',
  repositorySchema,
);
