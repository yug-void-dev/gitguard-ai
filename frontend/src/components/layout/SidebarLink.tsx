/**
 * @file components/layout/SidebarLink.tsx
 * @description Individual navigation item for the Sidebar.
 * Highlights when the current route matches, with smooth animations and hover effects.
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  badge?: number;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  to,
  icon: Icon,
  label,
  collapsed,
  badge,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink to={to} title={collapsed ? label : undefined} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ x: collapsed ? 0 : 2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 12,
            /* vertical rhythm: more breathing room between links */
            padding: collapsed ? '11px 6px' : '11px 14px',
            borderRadius: 12,
            marginBottom: 6,
            cursor: 'pointer',
            background: isActive
              ? 'linear-gradient(90deg, rgba(99,102,241,0.22) 0%, rgba(34,211,238,0.06) 100%)'
              : hovered
              ? 'rgba(255,255,255,0.05)'
              : 'transparent',
            border: isActive
              ? '1px solid rgba(99,102,241,0.35)'
              : hovered
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid transparent',
            boxShadow: isActive ? 'inset 0 0 24px rgba(99,102,241,0.07)' : 'none',
            transition:
              'background 0.22s ease, border 0.22s ease, box-shadow 0.22s ease',
            overflow: 'hidden',
          }}
        >
          {/* ── Active left indicator bar ── */}
          {isActive && (
            <motion.span
              layoutId="active-indicator"
              style={{
                position: 'absolute',
                left: 0,
                top: '15%',
                height: '70%',
                width: 3,
                borderRadius: '0 3px 3px 0',
                background: 'linear-gradient(to bottom, #6366f1, #22d3ee)',
                boxShadow: '0 0 12px rgba(34,211,238,0.55)',
              }}
              initial={false}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          {/* ── Glow shimmer on hover ── */}
          {hovered && !isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* ── Icon ── */}
          <motion.div
            animate={{
              color: isActive ? '#22d3ee' : hovered ? '#a5b4fc' : '#64748b',
              scale: hovered ? 1.12 : 1,
            }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: 20,
              height: 20,
              filter: isActive ? 'drop-shadow(0 0 6px rgba(34,211,238,0.4))' : 'none',
            }}
          >
            <Icon size={17} />
          </motion.div>

          {/* ── Label ── */}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  fontFamily: 'var(--font-body, Inter)',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#e2e8f0' : hovered ? '#cbd5e1' : '#94a3b8',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                  flex: 1,
                  transition: 'color 0.22s ease',
                }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* ── Badge ── */}
          {badge !== undefined && badge > 0 && !collapsed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                padding: '0 5px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(99,102,241,0.45)',
                flexShrink: 0,
              }}
            >
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </motion.div>
      )}
    </NavLink>
  );
};

export default SidebarLink;
