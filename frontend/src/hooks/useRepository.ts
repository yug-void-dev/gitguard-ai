/**
 * @file hooks/useRepository.ts
 * @description Custom hook for managing GitHub repositories connected to GitGuard AI.
 * Handles listing, connecting, disconnecting, and updating per-repo rule config.
 */

import { useState, useEffect, useCallback } from 'react';
import repositoryService from '../services/repository.service';
import type { ConnectedRepo, Repository, RepositoryRule } from '../types/repository.types';

// ─── Return types ─────────────────────────────────────────────────────────────

export interface UseRepositoryReturn {
  /** Repositories connected to GitGuard AI */
  connectedRepos: ConnectedRepo[];
  /** All GitHub repos the user has access to (for the connect picker) */
  githubRepos: Repository[];
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  /** Refresh the connected repos list */
  refetch: () => void;
  /** Load the user's GitHub repos for the picker (lazy — call on demand) */
  loadGitHubRepos: () => Promise<void>;
  /** Connect a GitHub repo to GitGuard AI */
  connectRepo: (fullName: string, repoId: number) => Promise<void>;
  /** Disconnect a repo from GitGuard AI */
  disconnectRepo: (repoId: string) => Promise<void>;
  /** Update rule config for a specific connected repo */
  updateRules: (repoId: string, rules: Partial<RepositoryRule>) => Promise<void>;
  /** Toggle active status */
  toggleActive: (repoId: string, isActive: boolean) => Promise<void>;
}

/**
 * Central hook for all repository-related state and mutations.
 *
 * @example
 *   const { connectedRepos, connectRepo, updateRules, isLoading } = useRepository();
 */
export function useRepository(): UseRepositoryReturn {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [githubRepos, setGithubRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch connected repos ──────────────────────────────────────────────────
  const fetchConnected = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const repos = await repositoryService.getConnectedRepos();
      setConnectedRepos(repos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnected(); }, [fetchConnected]);

  // ─── Lazy-load GitHub repo picker ──────────────────────────────────────────
  const loadGitHubRepos = useCallback(async () => {
    if (githubRepos.length > 0) return; // already loaded
    setIsLoading(true);
    try {
      const repos = await repositoryService.getGitHubRepos();
      setGithubRepos(repos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub repositories');
    } finally {
      setIsLoading(false);
    }
  }, [githubRepos.length]);

  // ─── Connect ────────────────────────────────────────────────────────────────
  const connectRepo = useCallback(async (fullName: string, repoId: number) => {
    setIsConnecting(true);
    setError(null);
    try {
      const connected = await repositoryService.connectRepository(fullName, repoId);
      setConnectedRepos((prev) => [...prev, connected]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository');
      throw err; // re-throw so the UI can respond
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ─── Disconnect ─────────────────────────────────────────────────────────────
  const disconnectRepo = useCallback(async (repoId: string) => {
    setError(null);
    try {
      await repositoryService.disconnectRepository(repoId);
      setConnectedRepos((prev) => prev.filter((r) => r._id !== repoId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect repository');
      throw err;
    }
  }, []);

  // ─── Update rules ────────────────────────────────────────────────────────────
  const updateRules = useCallback(async (repoId: string, rules: Partial<RepositoryRule>) => {
    setError(null);
    try {
      const updated = await repositoryService.updateRepositoryRules(repoId, rules);
      setConnectedRepos((prev) =>
        prev.map((r) => (r._id === repoId ? updated : r)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rules');
      throw err;
    }
  }, []);

  // ─── Toggle active ───────────────────────────────────────────────────────────
  const toggleActive = useCallback(async (repoId: string, isActive: boolean) => {
    setError(null);
    try {
      const updated = await repositoryService.toggleRepositoryActive(repoId, isActive);
      setConnectedRepos((prev) =>
        prev.map((r) => (r._id === repoId ? updated : r)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update repository');
      throw err;
    }
  }, []);

  return {
    connectedRepos,
    githubRepos,
    isLoading,
    isConnecting,
    error,
    refetch: fetchConnected,
    loadGitHubRepos,
    connectRepo,
    disconnectRepo,
    updateRules,
    toggleActive,
  };
}
