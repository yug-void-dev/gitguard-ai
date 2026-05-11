export interface User {
  id: string;
  login: string;
  email: string;
  avatarUrl: string;
  githubId?: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  login: string; // email or username
  password: string;
}

export interface RegisterCredentials {
  login: string;
  email: string;
  password: string;
}
