/**
 * @file services/history.service.ts
 * @description API calls for the review history feature.
 * Wraps the same /reviews endpoints but adds richer filter support
 * and a CSV export helper for the HistoryPage.
 */

import api from './api';
import type { Review } from '../types/review.types';
import type { PaginatedResponse, ListQueryParams } from '../types/api.types';

// ─── Extended query params for history ────────────────────────────────────────

export interface HistoryQueryParams extends ListQueryParams {
  /** Filter by review status */
  status?: 'pending' | 'completed' | 'failed' | 'all';
  /** Filter by repository full name, e.g. "owner/repo" */
  repository?: string;
  /** ISO-8601 start date for date-range filter */
  dateFrom?: string;
  /** ISO-8601 end date for date-range filter */
  dateTo?: string;
  /** Minimum severity to include: "high" | "medium" | "low" | "info" */
  severity?: string;
}

// ─── Response shapes ───────────────────────────────────────────────────────────

interface PaginatedReviewsApiResponse {
  success: boolean;
  reviews: Review[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

// ─── Service functions ─────────────────────────────────────────────────────────

/**
 * Fetches a paginated, filtered list of reviews for the History page.
 */
export const getHistory = async (
  params: HistoryQueryParams = {},
): Promise<PaginatedResponse<Review>> => {
  const {
    page = 1,
    limit = 10,
    status,
    repository,
    dateFrom,
    dateTo,
    severity,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  // Build query string — omit undefined values
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  query.set('sortBy', sortBy);
  query.set('sortOrder', sortOrder);
  if (status && status !== 'all') query.set('status', status);
  if (repository) query.set('repository', repository);
  if (dateFrom) query.set('dateFrom', dateFrom);
  if (dateTo) query.set('dateTo', dateTo);
  if (severity) query.set('severity', severity);
  if (search) query.set('search', search);

  const { data } = await api.get<PaginatedReviewsApiResponse>(
    `/reviews?${query.toString()}`,
  );

  return {
    items: data.reviews,
    totalItems: data.totalItems,
    totalPages: data.totalPages,
    currentPage: data.currentPage,
    pageSize: limit,
  };
};

/**
 * Exports the current filtered history as a CSV string.
 * Falls back to client-side generation from review data if the backend
 * does not expose a dedicated export endpoint.
 */
export const exportHistoryCSV = (reviews: Review[]): void => {
  const headers = [
    'ID',
    'Repository',
    'PR Number',
    'PR Title',
    'Status',
    'Findings',
    'Vulnerabilities',
    'Quality Score',
    'Created At',
  ];

  const rows = reviews.map((r) => [
    r.id,
    r.repository.fullName,
    r.prNumber,
    `"${r.prTitle.replace(/"/g, '""')}"`,
    r.status,
    r.findings.length,
    r.metrics.vulnerabilitiesCount,
    r.metrics.codeQualityScore,
    new Date(r.createdAt).toISOString(),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `gitguard-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const historyService = {
  getHistory,
  exportHistoryCSV,
};

export default historyService;
