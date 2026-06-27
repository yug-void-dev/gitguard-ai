/**
 * @file pages/OAuthCallbackPage.tsx
 * @description Public landing page for the GitHub OAuth callback redirect.
 *
 * Flow:
 *   1. Backend finishes OAuth → redirects to /auth/callback?token=xxx&gh_login=1
 *   2. This page (PUBLIC — not behind ProtectedRoute) runs immediately
 *   3. Captures the JWT from the URL, stores it in localStorage
 *   4. Navigates to /dashboard (React Router, no full reload)
 *
 * Why a separate page is needed:
 *   The original approach stored the token inside DashboardLayout, but
 *   ProtectedRoute renders *before* DashboardLayout mounts.  When there is
 *   no token in localStorage yet, ProtectedRoute redirects to "/" before
 *   DashboardLayout ever has a chance to save the token — causing an
 *   infinite redirect-to-login loop after GitHub OAuth.
 */

import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { STORAGE_KEYS } from '../constants/config';
import { AuthContext } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // ① Persist token BEFORE any protected route check runs
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

      // ② Re-validate with the backend so AuthContext has a populated user
      authCtx?.checkAuth().then(() => {
        // ③ Navigate to dashboard (client-side, no reload)
        navigate(ROUTES.DASHBOARD, { replace: true });
      });
    } else {
      // No token → something went wrong; send back to login
      navigate(ROUTES.LOGIN, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d1117',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#818cf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
        Completing GitHub sign-in…
      </p>
    </div>
  );
};

export default OAuthCallbackPage;
