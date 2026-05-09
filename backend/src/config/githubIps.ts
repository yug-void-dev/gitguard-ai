/**
 * @file src/config/githubIps.ts
 * @description Static list of GitHub Webhook CIDR ranges.
 * 
 * Source: https://api.github.com/meta (hooks section)
 * Last Updated: May 2024
 */

export const GITHUB_HOOKS_CIDRS: string[] = [
  // IPv4
  '192.30.252.0/22',
  '185.199.108.0/22',
  '140.82.112.0/20',
  '143.55.64.0/20',
  // IPv6
  '2a0a:a440::/29',
  '2606:50c0::/32'
];

/**
 * System design note: In a production environment with high availability,
 * you would ideally have a background service that fetches these ranges
 * from GitHub's API once a day and updates a cache/database.
 * 
 * For this implementation, we use a curated static list as a robust fallback.
 */
