/**
 * @file src/models/Repository.ts
 * @description Mongoose model for repositories connected to GitGuard AI.
 * Stores GitHub repo metadata, owner reference, review rules, and webhook info.
 */

import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ReviewMode = 'full' | 'security-only' | 'strict' | 'off';

export interface IRepositoryRule {
  strictMode: boolean;
  ignoreLinting: boolean;
  checkPerformance: boolean;
  minConfidence: number;
}

export interface IRepository extends Document {
  // GitHub identifiers
  githubId: number;          // same as repositoryId for compatibility
  fullName: string;          // same as repositoryFullName for compatibility
  // owner reference
  ownerId: Types.ObjectId;
  // GitHub metadata
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  // webhook
  webhookId?: number;
  // review configuration
  reviewMode: ReviewMode;
  ignorePatterns: string[];
  rules: IRepositoryRule;
  // status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const repositoryRuleSchema = new Schema<IRepositoryRule>(
  {
    strictMode:       { type: Boolean, default: false },
    ignoreLinting:    { type: Boolean, default: false },
    checkPerformance: { type: Boolean, default: true },
    minConfidence:    { type: Number, default: 0.7, min: 0, max: 1 },
  },
  { _id: false },
);

const repositorySchema = new Schema<IRepository>(
  {
    githubId:       { type: Number, required: true, index: true },
    fullName:       { type: String, required: true, index: true },
    ownerId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPrivate:      { type: Boolean, default: false },
    defaultBranch:  { type: String, default: 'main' },
    language:       { type: String, default: null },
    webhookId:      { type: Number },
    reviewMode:     {
      type: String,
      enum: ['full', 'security-only', 'strict', 'off'],
      default: 'full',
    },
    ignorePatterns: { type: [String], default: [] },
    rules: { type: repositoryRuleSchema, default: (): Record<string, unknown> => ({}) },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'repositories' },
);

// Compound unique index — one user cannot connect the same repo twice
repositorySchema.index({ githubId: 1, ownerId: 1 }, { unique: true });

export const Repository: Model<IRepository> = mongoose.model<IRepository>(
  'Repository',
  repositorySchema,
);
