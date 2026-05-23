/**
 * @file hooks/useReviews.ts
 * @description Custom hook for fetching and managing the paginated review list.
 * Provides filtering, pagination, single-review fetch, and stats fetch.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import reviewService, {
  type PaginatedReviews,
  type ReviewStats,
} from '../services/review.service';
import type { Review } from '../types/review.types';
import { DEFAULT_PAGE_SIZE } from '../constants/config';

// ─── Filter shape ─────────────────────────────────────────────────────────────

export interface ReviewFilters {
  status?: 'all' | 'pending' | 'completed' | 'failed';
  repository?: string;
  severity?: string;
  search?: string;
}

// ─── Hook return types ────────────────────────────────────────────────────────

export interface UseReviewsReturn {
  reviews: Review[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  filters: ReviewFilters;
  setFilters: (filters: ReviewFilters) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

export interface UseReviewStatsReturn {
  stats: ReviewStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseSingleReviewReturn {
  review: Review | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated, filterable list of reviews.
 *
 * @param initialFilters  Optional initial filter state
 * @param pageSize        Results per page (default: DEFAULT_PAGE_SIZE)
 */
export function useReviews(
  initialFilters: ReviewFilters = {},
  pageSize = DEFAULT_PAGE_SIZE,
): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ReviewFilters>(initialFilters);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const data: PaginatedReviews = await reviewService.getReviews(currentPage, pageSize);
      setReviews(data.reviews);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'Failed to load reviews';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  const setFilters = useCallback((next: ReviewFilters) => {
    setFiltersState(next);
    setCurrentPage(1); // reset to first page on filter change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    reviews,
    totalItems,
    totalPages,
    currentPage,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refetch: fetch,
  };
}

// ─── Stats hook ───────────────────────────────────────────────────────────────

/** Fetches aggregate review statistics for the dashboard. */
export function useReviewStats(): UseReviewStatsReturn {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reviewService.getReviewStats();
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, isLoading, error, refetch: fetch };
}

// ─── Single review hook ───────────────────────────────────────────────────────

/** Fetches a single review by ID. */
export function useSingleReview(reviewId: string | undefined): UseSingleReviewReturn {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!reviewId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await reviewService.getReview(reviewId);
      setReview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { review, isLoading, error, refetch: fetch };
}
