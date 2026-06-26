/**
 * @file components/layout/Sidebar.tsx
 * @description Collapsible left-side navigation sidebar.
 * - Desktop: collapses/expands with spring animation (68px ↔ 240px).
 * - Mobile (≤768px): fixed overlay drawer that slides in/out from the left.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GitPullRequest,
  History,
  Settings,
  BookOpen,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import SidebarLink from './SidebarLink';
import { ROUTES } from '../../constants/routes';
import { APP_NAME } from '../../constants/config';
import { useTheme } from '../../hooks/useTheme';
import { T } from '../../constants/theme';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD,    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: ROUTES.REPOSITORIES, icon: BookOpen,         label: 'Repositories' },
  { to: ROUTES.REVIEWS,      icon: GitPullRequest,   label: 'Reviews'      },
  { to: ROUTES.HISTORY,      icon: History,          label: 'History'      },
  { to: ROUTES.SETTINGS,     icon: Settings,         label: 'Settings'     },
] as const;

// Smooth spring
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 32, mass: 0.9 };

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // On mobile: sidebar is always "expanded" width but hides off-screen via translateX
  const mobileVariants = {
    open:   { x: 0,    transition: { type: 'spring', stiffness: 340, damping: 34 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 340, damping: 34 } },
  };

  const sidebarBg = isLight
    ? 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'
    : 'linear-gradient(180deg,rgba(7,8,22,0.99) 0%,rgba(9,10,28,0.98) 100%)';

  // ── Mobile drawer ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <motion.aside
        variants={mobileVariants}
        initial="closed"
        animate={mobileOpen ? 'open' : 'closed'}
        className="sidebar-mobile-drawer"
        style={{
          width: 240,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: sidebarBg,
          borderRight: `1px solid ${T.border}`,
          backdropFilter: 'blur(20px)',
          zIndex: 50,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${T.border}`,
            padding: '0 14px',
            justifyContent: 'space-between',
            gap: 10,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg,#6366f1 0%,#22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 18px rgba(99,102,241,0.45)',
              }}
            >
              <ShieldCheck size={17} color="#fff" />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display,Outfit,Inter)',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: -0.3,
                color: T.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {APP_NAME}
            </span>
          </div>

          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(99,102,241,0.18)' }}
            whileTap={{ scale: 0.88 }}
            onClick={onMobileClose}
            title="Close menu"
            style={{
              width: 30,
              height: 30,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.22)',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </motion.button>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '18px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div style={{ paddingLeft: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(148,163,184,0.4)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body,Inter)',
            }}>
              Navigation
            </span>
          </div>

          {NAV_ITEMS.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.22 }}
            >
              <SidebarLink
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={false}
                onClick={onMobileClose}
              />
            </motion.div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}` }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 9,
            background: `${T.green}12`,
            border: `1px solid ${T.green}25`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.green,
              boxShadow: `0 0 6px ${T.green}80`,
              flexShrink: 0,
              display: 'inline-block',
            }} className="animate-pulse" />
            <span style={{
              fontSize: 11, color: T.sub, fontWeight: 500,
              fontFamily: 'var(--font-body,Inter)',
            }}>
              Sentinel Active
            </span>
          </div>
        </div>
      </motion.aside>
    );
  }

  // ── Desktop sidebar (collapsible) ──────────────────────────────────────────
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={SPRING}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: sidebarBg,
        borderRight: `1px solid ${T.border}`,
        backdropFilter: 'blur(20px)',
        zIndex: 50,
        flexShrink: 0,
        overflow: 'hidden',
        willChange: 'width',
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${T.border}`,
          padding: '0 14px',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.button
              key="menu-btn"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(99,102,241,0.18)' }}
              whileTap={{ scale: 0.88 }}
              onClick={onToggle}
              title="Expand sidebar"
              style={{
                width: 38,
                height: 38,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.22)',
                borderRadius: 10,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Menu size={16} />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}
            >
              <motion.div
                whileHover={{ scale: 1.06 }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#6366f1 0%,#22d3ee 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 18px rgba(99,102,241,0.45)',
                }}
              >
                <ShieldCheck size={17} color="#fff" />
              </motion.div>

              <span
                style={{
                  fontFamily: 'var(--font-display,Outfit,Inter)',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: -0.3,
                  color: T.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {APP_NAME}
              </span>

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(99,102,241,0.18)' }}
                whileTap={{ scale: 0.88 }}
                onClick={onToggle}
                title="Collapse sidebar"
                style={{
                  width: 30,
                  height: 30,
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.22)',
                  borderRadius: 8,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Nav ─── */}
      <nav
        style={{
          flex: 1,
          padding: collapsed ? '18px 8px' : '18px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              key="nav-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ paddingLeft: 10, marginBottom: 10 }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(148,163,184,0.4)',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-body,Inter)',
              }}>
                Navigation
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {NAV_ITEMS.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.22 }}
          >
            <SidebarLink
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          </motion.div>
        ))}
      </nav>

      {/* ─── Footer ─── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}` }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 9,
              background: `${T.green}12`,
              border: `1px solid ${T.green}25`,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: T.green,
                boxShadow: `0 0 6px ${T.green}80`,
                flexShrink: 0,
                display: 'inline-block',
              }} className="animate-pulse" />
              <span style={{
                fontSize: 11, color: T.sub, fontWeight: 500,
                fontFamily: 'var(--font-body,Inter)',
              }}>
                Sentinel Active
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

export default Sidebar;
