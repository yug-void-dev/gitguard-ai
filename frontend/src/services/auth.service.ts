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

export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string; previewUrl?: string }> => {
  const { data } = await api.post<{ success: boolean; message: string; previewUrl?: string }>('/auth/forgot-password', { email });
  return data;
};

export const verifyOtp = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post<{ success: boolean; message: string }>('/auth/verify-otp', { email, otp });
  return data;
};

export const resetPassword = async (email: string, otp: string, password: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post<{ success: boolean; message: string }>('/auth/reset-password', { email, otp, password });
  return data;
};

export const authService = {
  login,
  register,
  logout,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
