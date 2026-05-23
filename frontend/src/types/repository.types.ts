/**
 * @file types/repository.types.ts
 * @description TypeScript types for GitHub repositories and per-repo rule config.
 */

/** A GitHub repository as returned by the backend / GitHub API. */
export interface Repository {
  id: number;
  name: string;
  fullName: string;   // "owner/repo"
  owner: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  openIssuesCount: number;
  htmlUrl: string;
  cloneUrl: string;
  updatedAt: string;
}

/** Rules that control how the AI analyses a connected repository. */
export interface RepositoryRule {
  /** Enable strict security scanning (fails on any high-severity finding). */
  strictMode: boolean;
  /** Ignore stylistic / linter issues in the LLM prompt. */
  ignoreLinting: boolean;
  /** Check for performance anti-patterns. */
  checkPerformance: boolean;
  /** Minimum confidence threshold (0–1) before a finding is reported. */
  minConfidence: number;
}

/** A repository that has been connected to GitGuard AI (stored in DB). */
export interface ConnectedRepo {
  _id: string;
  repositoryFullName: string;
  repositoryId: number;
  ownerId: string;
  rules: RepositoryRule;
  webhookId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated join from repository metadata */
  meta?: Pick<Repository, 'description' | 'language' | 'stargazersCount' | 'htmlUrl'>;
}

/** Payload sent when updating a repository's rule configuration. */
export interface UpdateRepoRulesPayload {
  rules: Partial<RepositoryRule>;
}
