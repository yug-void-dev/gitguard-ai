/**
 * @file constants/config.ts
 * @description Central configuration constants for the GitGuard AI frontend.
 * All environment-sensitive values are read from import.meta.env so they
 * can be overridden per deployment without changing source code.
 */

/** Base URL for every REST API call (proxied via Vite in dev). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/** WebSocket / Socket.IO server URL. */
export const WS_URL =
  import.meta.env.VITE_WS_URL || 'http://localhost:5000';

/** Human-readable product name shown in the UI. */
export const APP_NAME = 'GitGuard AI';

/** Short tagline used on the login page hero. */
export const APP_TAGLINE = 'Automated Pull Request Sentinel';

/** GitHub OAuth initiation endpoint (full redirect). */
export const GITHUB_OAUTH_URL = `${API_BASE_URL}/auth/github`;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

// ─── Polling / refresh intervals (ms) ─────────────────────────────────────────
/** How often the dashboard polls live queue metrics when WebSocket is unavailable. */
export const QUEUE_POLL_INTERVAL_MS = 15_000;

/** How often the live review feed polls for new events (fallback). */
export const FEED_POLL_INTERVAL_MS = 10_000;

// ─── Local-storage keys ────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  THEME: 'gg_theme',
  SIDEBAR_COLLAPSED: 'gg_sidebar_collapsed',
  EMAIL_ALERTS: 'gg_email_alerts',
  AUTO_REVIEW: 'gg_auto_review',
  AUTH_TOKEN: 'gg_auth_token',
} as const;

// ─── Severity ordering (high → low priority) ──────────────────────────────────
export const SEVERITY_ORDER = ['high', 'medium', 'low', 'info'] as const;
