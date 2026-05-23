/**
 * @file constants/routes.ts
 * @description Typed route-path constants.
 * Import these instead of raw strings so refactoring is safe & central.
 */

export const ROUTES = {
  // Public
  LOGIN: '/',

  // Protected – dashboard
  DASHBOARD: '/dashboard',

  // Protected – repositories
  REPOSITORIES: '/repositories',

  // Protected – reviews
  REVIEWS: '/reviews',

  // Protected – history
  HISTORY: '/history',

  /** Dynamic segment helper – call as ROUTES.REVIEW_DETAIL('abc123') */
  REVIEW_DETAIL: (id: string) => `/history/${id}`,

  // Protected – settings
  SETTINGS: '/settings',

  // Catch-all
  NOT_FOUND: '*',
} as const;

/** Raw path patterns used in the router (with `:param` placeholders). */
export const ROUTE_PATTERNS = {
  REVIEW_DETAIL: '/history/:reviewId',
} as const;
