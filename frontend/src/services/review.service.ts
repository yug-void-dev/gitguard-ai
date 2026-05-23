import api from './api';
import type { Review } from '../types/review.types';

export interface PaginatedReviews {
  reviews: Review[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface ReviewStats {
  totalReviews: number;
  completed: number;
  pending: number;
  failed: number;
  totalVulnerabilities: number;
  averageScore: number;
}

export const getReviews = async (page = 1, limit = 10): Promise<PaginatedReviews> => {
  const { data } = await api.get<{ success: boolean } & PaginatedReviews>(`/reviews?page=${page}&limit=${limit}`);
  return {
    reviews: data.reviews,
    totalItems: data.totalItems,
    totalPages: data.totalPages,
    currentPage: data.currentPage
  };
};

export const getReviewStats = async (): Promise<ReviewStats> => {
  const { data } = await api.get<{ success: boolean; stats: ReviewStats }>('/reviews/stats');
  return data.stats;
};

export const getReview = async (reviewId: string): Promise<Review> => {
  const { data } = await api.get<{ success: boolean; review: Review }>(`/reviews/${reviewId}`);
  return data.review;
};

const reviewService = {
  getReviews,
  getReviewStats,
  getReview,
};

export default reviewService;
