/**
 * @file services/api.ts
 * @description Axios instance used by all services.
 * - Base URL from VITE_API_BASE_URL env var
 * - Credentials (httpOnly cookies) sent on every request
 * - Response interceptor: on 401, redirect to login without refreshing
 */

import axios, { type AxiosError } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attach JWT from localStorage (set after GitHub OAuth or email/password login)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Avoid redirect loops on the login page itself
      if (!window.location.pathname.includes('/')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
