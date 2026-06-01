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
    reviews: data.reviews.map((r: any) => ({
      ...r,
      id: r.id || r._id,
    })),
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
  const { data } = await api.get<{ success: boolean; review: any }>(`/reviews/${reviewId}`);
  return {
    ...data.review,
    id: data.review.id || data.review._id,
  };
};

export const getCommentByReview = async (reviewId: string): Promise<any> => {
  const { data } = await api.get<{ success: boolean; comment: any }>(`/comments/review/${reviewId}`);
  return data.comment;
};

export const applySuggestion = async (commentId: string, findingId: string): Promise<any> => {
  const { data } = await api.post<{ success: boolean; commitSha?: string }>(`/comments/${commentId}/apply`, {
    findingId,
  });
  return data;
};

const reviewService = {
  getReviews,
  getReviewStats,
  getReview,
  getCommentByReview,
  applySuggestion,
};

export default reviewService;

