import api from './api';
import type { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types/auth.types';

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', credentials);
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const getMe = async (): Promise<{ success: boolean; user: User }> => {
  const { data } = await api.get<{ success: boolean; user: User }>('/auth/me');
  return data;
};

export const authService = {
  login,
  register,
  logout,
  getMe,
};
