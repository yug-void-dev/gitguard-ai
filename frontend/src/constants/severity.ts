/**
 * @file constants/severity.ts
 * @description Severity level definitions, ordering, labels and colour tokens.
 * Single source of truth for anything severity-related across the app.
 */

export type SeverityLevel = 'high' | 'medium' | 'low' | 'info';

/** Ordered from most critical to least critical. */
export const SEVERITY_LEVELS: SeverityLevel[] = ['high', 'medium', 'low', 'info'];

/** Human-readable label for each severity. */
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

/**
 * Tailwind CSS classes for text colour per severity.
 * Used by SeverityTag, FindingCard, Badge, etc.
 */
export const SEVERITY_TEXT_CLASSES: Record<SeverityLevel, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-sky-400',
  info: 'text-slate-400',
};

/**
 * Tailwind CSS classes for background + border per severity.
 * Used by SeverityTag chips and badges.
 */
export const SEVERITY_BG_CLASSES: Record<SeverityLevel, string> = {
  high: 'bg-red-500/10 border-red-500/30',
  medium: 'bg-amber-500/10 border-amber-500/30',
  low: 'bg-sky-500/10 border-sky-500/30',
  info: 'bg-slate-500/10 border-slate-500/30',
};

/** Raw hex colours — used by Recharts or canvas-based charts. */
export const SEVERITY_HEX: Record<SeverityLevel, string> = {
  high: '#f87171',    // red-400
  medium: '#fbbf24',  // amber-400
  low: '#38bdf8',     // sky-400
  info: '#94a3b8',    // slate-400
};

/** Numeric priority weight (lower = more critical). */
export const SEVERITY_WEIGHT: Record<SeverityLevel, number> = {
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
