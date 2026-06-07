/**
 * @file layouts/DashboardLayout.tsx
 * @description Shell layout for all protected dashboard routes.
 * Composes: Sidebar (left) + vertical content area (Navbar top + <Outlet>).
 * Sidebar collapse/expand uses a silky spring transition.
 * Locomotive Scroll v5 (Lenis) applied to the main content scroller.
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { AppBackground } from '../components/layout/AppBackground';
import { STORAGE_KEYS } from '../constants/config';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';


/**
 * DashboardLayout assembles the main application chrome:
 *
 *  ┌──────────┬────────────────────────────┐
 *  │          │  Navbar                    │
 *  │ Sidebar  ├────────────────────────────┤
 *  │          │  <Outlet> (page content)   │
 *  └──────────┴────────────────────────────┘
 */
const DashboardLayout: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();


  // ── GitHub OAuth arrival toast ──────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('gh_login') === '1') {
      // Small delay so the dashboard finishes mounting before the toast appears
      const t = setTimeout(() => {
        toast.success(
          '🔐 GitHub Authorization Successful',
          'Welcome! Your GitHub account has been linked. GitGuard AI Sentinel is now active and monitoring your repositories.',
          6000
        );
      }, 600);

      // Strip the query param so a refresh doesn't retrigger the toast
      setSearchParams((prev) => {
        prev.delete('gh_login');
        return prev;
      }, { replace: true });

      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);



  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-deep)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Global ambient background (bubbles + glows) rendered once for all pages ── */}
      <AppBackground />

      {/* ── Sidebar ── */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* ── Main column ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Navbar ── */}
        <Navbar onMenuClick={toggleSidebar} />

        {/* ── Page content ── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px 28px',
            position: 'relative',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
