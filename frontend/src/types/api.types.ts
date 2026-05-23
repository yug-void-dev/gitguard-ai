/**
 * @file types/api.types.ts
 * @description Generic API response shapes shared across all services.
 * These mirror the backend's ApiResponse<T> contract.
 */

/** Standard success envelope returned by every backend endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/** Paginated list envelope (reviews, history, etc.). */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/** Shape of a 4xx / 5xx error response from the backend. */
export interface ApiError {
  success: false;
  message: string;
  /** Optional field-level validation errors */
  errors?: Record<string, string>;
  statusCode?: number;
}

/** Discriminated union for async data states in hooks. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/** Generic filter/sort query params used by paginated endpoints. */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
