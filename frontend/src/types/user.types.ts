/**
 * @file types/user.types.ts
 * @description Extended user profile and settings types.
 * The core User shape lives in auth.types.ts; this file adds richer
 * profile and settings that the Settings page consumes.
 */

/** User notification preferences stored in the backend. */
export interface NotificationPreferences {
  emailOnComplete: boolean;
  emailOnFailure: boolean;
  browserPush: boolean;
}

/** Extended user profile (superset of auth.types User). */
export interface UserProfile {
  id: string;
  login: string;
  email: string;
  avatarUrl: string;
  githubId?: number;
  name?: string;
  bio?: string;
  company?: string;
  location?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  githubProfileUrl?: string;
  createdAt?: string;
}

/** Application-level settings the user can toggle. */
export interface UserSettings {
  notifications: NotificationPreferences;
  /** Theme preference — stored client-side via ThemeContext but surface here for parity. */
  theme: 'dark' | 'light';
}

/** Payload for updating user settings via PATCH /api/users/settings. */
export type UpdateUserSettingsPayload = Partial<UserSettings>;
