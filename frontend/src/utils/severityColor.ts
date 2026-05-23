/**
 * @file utils/severityColor.ts
 * @description Maps severity levels to their colour tokens.
 * Delegates to the canonical definitions in constants/severity.ts
 * and exposes convenient helper functions.
 */

import type { SeverityLevel } from '../constants/severity';
import {
  SEVERITY_TEXT_CLASSES,
  SEVERITY_BG_CLASSES,
  SEVERITY_HEX,
} from '../constants/severity';

/**
 * Returns the Tailwind text-colour class for a severity level.
 * Falls back to slate (info) for unknown values.
 *
 * @example
 *   severityTextClass('high') // → 'text-red-400'
 */
export function severityTextClass(severity: string): string {
  return SEVERITY_TEXT_CLASSES[severity as SeverityLevel] ?? SEVERITY_TEXT_CLASSES.info;
}

/**
 * Returns the combined Tailwind bg + border classes for a severity chip.
 *
 * @example
 *   severityBgClass('medium') // → 'bg-amber-500/10 border-amber-500/30'
 */
export function severityBgClass(severity: string): string {
  return SEVERITY_BG_CLASSES[severity as SeverityLevel] ?? SEVERITY_BG_CLASSES.info;
}

/**
 * Returns the raw hex colour for a severity level.
 * Useful when colouring SVG / canvas elements (e.g. Recharts).
 *
 * @example
 *   severityHex('high') // → '#f87171'
 */
export function severityHex(severity: string): string {
  return SEVERITY_HEX[severity as SeverityLevel] ?? SEVERITY_HEX.info;
}

/**
 * Convenience: returns both text and bg Tailwind classes combined.
 *
 * @example
 *   severityClasses('low') // → 'text-sky-400 bg-sky-500/10 border-sky-500/30'
 */
export function severityClasses(severity: string): string {
  return `${severityTextClass(severity)} ${severityBgClass(severity)}`;
}
