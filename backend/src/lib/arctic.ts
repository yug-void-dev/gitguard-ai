/**
 * @file src/lib/arctic.ts
 * @description Arctic OAuth 2.0 provider initialization.
 */

import { GitHub } from 'arctic';
import { env } from '../config/env';

/**
 * Initialize Arctic GitHub Provider
 * Uses validated environment variables from src/config/env.ts
 */
export const github = new GitHub(
  env.GITHUB_CLIENT_ID,
  env.GITHUB_CLIENT_SECRET,
  env.GITHUB_CALLBACK_URL,
);
