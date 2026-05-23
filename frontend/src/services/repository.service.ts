/**
 * @file services/repository.service.ts
 * @description API calls for GitHub repository management.
 * Covers listing available GitHub repos, connecting/disconnecting repos
 * to GitGuard AI, and updating per-repo rule configuration.
 */

import api from './api';
import type { ConnectedRepo, Repository, RepositoryRule } from '../types/repository.types';

// ─── Response shapes ───────────────────────────────────────────────────────────

interface GitHubReposResponse {
  success: boolean;
  repos: Repository[];
}

interface ConnectedReposResponse {
  success: boolean;
  repos: ConnectedRepo[];
}

interface SingleConnectedRepoResponse {
  success: boolean;
  repo: ConnectedRepo;
}

// ─── Service functions ─────────────────────────────────────────────────────────

/**
 * Fetches all GitHub repositories the authenticated user has access to.
 * These are repos that *can* be connected — not yet necessarily connected.
 */
export const getGitHubRepos = async (): Promise<Repository[]> => {
  const { data } = await api.get<GitHubReposResponse>('/github/repos');
  return data.repos;
};

/**
 * Fetches all repositories that have already been connected to GitGuard AI.
 */
export const getConnectedRepos = async (): Promise<ConnectedRepo[]> => {
  const { data } = await api.get<ConnectedReposResponse>('/repositories');
  return data.repos;
};

/**
 * Connects a GitHub repository to GitGuard AI.
 * The backend will register the webhook and save the repo config.
 *
 * @param fullName  Repository full name, e.g. "owner/repo"
 * @param repoId    Numeric GitHub repository ID
 */
export const connectRepository = async (
  fullName: string,
  repoId: number,
): Promise<ConnectedRepo> => {
  const { data } = await api.post<SingleConnectedRepoResponse>('/repositories/connect', {
    repositoryFullName: fullName,
    repositoryId: repoId,
  });
  return data.repo;
};

/**
 * Disconnects a repository from GitGuard AI.
 * The backend will remove the webhook and deactivate the record.
 *
 * @param repoId  The ConnectedRepo `_id` (MongoDB ObjectId string)
 */
export const disconnectRepository = async (repoId: string): Promise<void> => {
  await api.delete(`/repositories/${repoId}`);
};

/**
 * Updates the rule configuration for a connected repository.
 *
 * @param repoId  The ConnectedRepo `_id`
 * @param rules   Partial rule overrides to merge
 */
export const updateRepositoryRules = async (
  repoId: string,
  rules: Partial<RepositoryRule>,
): Promise<ConnectedRepo> => {
  const { data } = await api.patch<SingleConnectedRepoResponse>(
    `/repositories/${repoId}/rules`,
    { rules },
  );
  return data.repo;
};

/**
 * Toggles a repository's active status (pauses/resumes webhook processing).
 *
 * @param repoId    The ConnectedRepo `_id`
 * @param isActive  New active state
 */
export const toggleRepositoryActive = async (
  repoId: string,
  isActive: boolean,
): Promise<ConnectedRepo> => {
  const { data } = await api.patch<SingleConnectedRepoResponse>(
    `/repositories/${repoId}`,
    { isActive },
  );
  return data.repo;
};

const repositoryService = {
  getGitHubRepos,
  getConnectedRepos,
  connectRepository,
  disconnectRepository,
  updateRepositoryRules,
  toggleRepositoryActive,
};

export default repositoryService;
