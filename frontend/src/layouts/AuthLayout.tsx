/**
 * @file layouts/AuthLayout.tsx
 * @description Centered layout for public/auth pages (Login, Register).
 * Renders the page content centred against the deep-dark background.
 * No sidebar or navbar — clean, focused auth experience.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout is used by the router to wrap the LoginPage.
 * It provides a full-viewport container with the app's deep background colour
 * and centres its child content both horizontally and vertically.
 */
const AuthLayout: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-deep)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
