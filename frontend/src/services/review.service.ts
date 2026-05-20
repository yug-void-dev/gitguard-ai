import api from './api';
import type { Review } from '../types/review.types';

export const getReviews = async (): Promise<Review[]> => {
  const { data } = await api.get<{ success: boolean; reviews: Review[] }>('/reviews');
  return data.reviews;
};

export const getReview = async (reviewId: string): Promise<Review> => {
  const { data } = await api.get<{ success: boolean; review: Review }>(`/reviews/${reviewId}`);
  return data.review;
};

const reviewService = {
  getReviews,
  getReview,
};

export default reviewService;
