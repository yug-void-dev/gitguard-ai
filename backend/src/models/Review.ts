/**
 * @file src/models/Review.ts
 * @description Mongoose model for AI Code Analysis Results.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFinding {
  _id?: any;
  id?: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  suggestion: string;
  confidence: number;
  category?: string;
}

export interface IReview extends Document {
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  prNumber: number;
  prTitle: string;
  status: 'pending' | 'completed' | 'failed';
  triggeredBy: mongoose.Types.ObjectId;
  findings: IFinding[];
  summary: string;
  metrics: {
    vulnerabilitiesCount: number;
    performanceIssuesCount: number;
    codeQualityScore: number;
  };
  diffData: string;
  createdAt: Date;
  updatedAt: Date;
}

const findingSchema = new Schema<IFinding>({
  file: { type: String, required: true },
  line: { type: Number, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required: true },
  message: { type: String, required: true },
  suggestion: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1 },
});

const reviewSchema = new Schema<IReview>(
  {
    repository: {
      owner: { type: String, required: true },
      name: { type: String, required: true },
      fullName: { type: String, required: true },
    },
    prNumber: { type: Number, required: true },
    prTitle: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    findings: [findingSchema],
    summary: { type: String },
    metrics: {
      vulnerabilitiesCount: { type: Number, default: 0 },
      performanceIssuesCount: { type: Number, default: 0 },
      codeQualityScore: { type: Number, default: 0 },
    },
    diffData: { type: String },
  },
  { timestamps: true, collection: 'reviews' },
);

export const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);
