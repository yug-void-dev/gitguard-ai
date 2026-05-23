/**
 * @file utils/truncateText.ts
 * @description Text-truncation helpers to keep long strings presentable in the UI.
 */

/**
 * Truncates a string to `maxLength` characters and appends `…` if needed.
 *
 * @param text     The source string.
 * @param maxLength Maximum number of characters before truncation (default 80).
 * @returns The original string or a truncated version ending with "…".
 *
 * @example
 *   truncateText('Hello World, this is a very long sentence', 20)
 *   // → 'Hello World, this is…'
 */
export function truncateText(text: string, maxLength = 80): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Truncates a string to `maxWords` words, appending "…" if trimmed.
 *
 * @example
 *   truncateWords('one two three four five', 3) // → 'one two three…'
 */
export function truncateWords(text: string, maxWords = 15): string {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

/**
 * Truncates a file path to show only the last `segments` path segments.
 *
 * @example
 *   truncatePath('src/components/dashboard/OverviewCard.tsx', 2)
 *   // → '…/dashboard/OverviewCard.tsx'
 */
export function truncatePath(path: string, segments = 2): string {
  if (!path) return '';
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.length <= segments) return path;
  return '…/' + parts.slice(-segments).join('/');
}

/**
 * Truncates a GitHub repository full name, keeping only the repo part.
 * e.g. "my-org/very-long-repo-name" → "very-long-repo-name"
 */
export function repoShortName(fullName: string): string {
  if (!fullName) return '';
  return fullName.includes('/') ? fullName.split('/')[1] : fullName;
}
