/**
 * @file utils/cn.ts
 * @description Utility that merges Tailwind class strings safely.
 * Uses clsx for conditional logic and tailwind-merge to deduplicate
 * conflicting Tailwind utilities (e.g. "p-2 p-4" → "p-4").
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-indigo-500', className)
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class values using clsx and resolves Tailwind conflicts
 * with tailwind-merge so the last relevant class always wins.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
