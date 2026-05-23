/**
 * @file layouts/DashboardLayout.tsx
 * @description Shell layout for all protected dashboard routes.
 * Composes: Sidebar (left) + vertical content area (Navbar top + <Outlet>).
 * The sidebar can be collapsed; state is persisted to localStorage.
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { STORAGE_KEYS } from '../constants/config';

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
      }}
    >
      {/* ── Sidebar ── */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* ── Main column ── */}
      <motion.div
        animate={{ flex: 1 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
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
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
