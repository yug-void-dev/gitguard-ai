/**
 * @file layouts/RootLayout.tsx
 * @description Top-level layout that wraps the entire application.
 * Injects ThemeProvider so every child can call useTheme().
 * Also sets up global scroll and overflow behaviour.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';

/**
 * RootLayout wraps every route in the application.
 * It is placed at the root of the router so ThemeContext is always available.
 *
 * Structure:
 *   <ThemeProvider>
 *     <Outlet />          ← AuthLayout or DashboardLayout renders here
 *   </ThemeProvider>
 */
const RootLayout: React.FC = () => {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  );
};

export default RootLayout;
