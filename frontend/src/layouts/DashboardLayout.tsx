/**
 * @file layouts/DashboardLayout.tsx
 * @description Shell layout for all protected dashboard routes.
 * Composes: Sidebar (left) + vertical content area (Navbar top + <Outlet>).
 * Sidebar collapse/expand uses a silky spring transition.
 * On mobile (≤768px) the sidebar becomes a full-height overlay drawer.
 */

import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { AppBackground } from '../components/layout/AppBackground';
import { STORAGE_KEYS } from '../constants/config';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';
import { GlobalErrorBoundary } from '../components/common/GlobalErrorBoundary';
import { AuthContext } from '../context/AuthContext';

const DashboardLayout: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const authCtx = useContext(AuthContext);

  // ── Capture JWT from GitHub OAuth redirect (?token=xxx&gh_login=1) ──────────
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      setSearchParams((prev) => {
        prev.delete('token');
        return prev;
      }, { replace: true });
      authCtx?.checkAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GitHub OAuth arrival toast ──────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('gh_login') === '1') {
      const t = setTimeout(() => {
        toast.success(
          '🔐 GitHub Authorization Successful',
          'Welcome! Your GitHub account has been linked. GitGuard AI Sentinel is now active and monitoring your repositories.',
          6000
        );
      }, 600);

      setSearchParams((prev) => {
        prev.delete('gh_login');
        return prev;
      }, { replace: true });

      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Desktop sidebar collapsed state (persisted) ─────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  // ── Mobile detection + mobile drawer open state ─────────────────────────────
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Close drawer when viewport grows back to desktop
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Unified toggle: hamburger on mobile opens drawer; desktop collapses sidebar
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const closeMobileDrawer = () => setMobileOpen(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        width: '100vw',
        background: 'var(--bg-deep)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Global ambient background ── */}
      <AppBackground />

      {/* ── Mobile backdrop overlay (closes drawer on tap) ── */}
      {isMobile && (
        <div
          className={`sidebar-backdrop${mobileOpen ? ' visible' : ''}`}
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileDrawer}
      />

      {/* ── Main column — always full-width on mobile ── */}
      <div
        className="dashboard-content-area"
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
            padding: 'var(--page-padding-y) var(--page-padding-x)',
            position: 'relative',
          }}
        >
          <GlobalErrorBoundary fallbackMessage="Failed to load dashboard content.">
            <Outlet />
          </GlobalErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
