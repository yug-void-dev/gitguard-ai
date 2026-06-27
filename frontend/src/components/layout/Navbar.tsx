/**
 * @file components/layout/Navbar.tsx
 * @description Top navigation bar for the dashboard shell.
 * Shows global search hint, a working notification bell with dropdown,
 * and the user avatar with a profile/logout menu.
 * NOTE: The sidebar toggle button lives in Sidebar.tsx — no duplicate here.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  LogOut,
  User,
  ChevronDown,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  RefreshCw,
  GitPullRequest,
  Trash2,
  X,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import Avatar from '../common/Avatar';
import { getNotifications, clearAllNotifications, dismissNotification, type Notification } from '../../services/notification.service';
import { useTheme } from '../../hooks/useTheme';
import { T } from '../../constants/theme';

interface NavbarProps {
  onMenuClick: () => void; // kept for potential mobile use, not rendered
}

// ─── Notification helpers ─────────────────────────────────────────────────────
function notifIcon(n: Notification) {
  if (n.outcome === 'success')  return <CheckCircle size={14} color="#10b981" />;
  if (n.outcome === 'failure')  return <XCircle     size={14} color="#ef4444" />;
  if (n.outcome === 'ignored')  return <Info        size={14} color="#f59e0b" />;
  return <GitPullRequest size={14} color="#818cf8" />;
}

function notifColor(n: Notification): string {
  if (n.outcome === 'success') return 'rgba(16,185,129,0.12)';
  if (n.outcome === 'failure') return 'rgba(239,68,68,0.12)';
  return 'rgba(245,158,11,0.10)';
}

function notifBorder(n: Notification): string {
  if (n.outcome === 'success') return 'rgba(16,185,129,0.2)';
  if (n.outcome === 'failure') return 'rgba(239,68,68,0.2)';
  return 'rgba(245,158,11,0.18)';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function eventLabel(n: Notification): string {
  const typeMap: Record<string, string> = {
    webhook_received:  'Webhook received',
    signature_validated: 'Signature validated',
    event_processed:   'PR processed',
    event_ignored:     'Event ignored',
  };
  return typeMap[n.eventType] ?? n.eventType;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar: React.FC<NavbarProps> = ({ onMenuClick: _onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // ── User dropdown ──
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Notifications ──
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notifications,   setNotifications]   = useState<Notification[]>([]);
  const [notifLoading,    setNotifLoading]     = useState(false);
  const [notifError,      setNotifError]       = useState<string | null>(null);
  const [unreadCount,     setUnreadCount]      = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.length);
    } catch {
      setNotifError('Could not load notifications');
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Open bell → fetch fresh data & mark as read
  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      fetchNotifications();
      setUnreadCount(0); // mark read when panel opens
    }
  };

  // Dismiss a single notification (optimistic)
  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = notifications;
    const updated = notifications.filter((n) => n._id !== id);
    setNotifications(updated);
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await dismissNotification(id);
    } catch {
      // Revert on failure
      setNotifications(prev);
      setUnreadCount(prev.length);
    }
  };

  // Clear all notifications (optimistic)
  const handleClearAll = async () => {
    const prev = notifications;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearAllNotifications();
    } catch {
      // Revert on failure
      setNotifications(prev);
      setUnreadCount(prev.length);
    }
  };

  // Poll unread count every 30s
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getNotifications();
        setUnreadCount(data.length);
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(12px, 3vw, 28px)',
        borderBottom: `1px solid ${T.border}`,
        background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(6,7,20,0.82)',
        backdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        gap: 10,
      }}
    >
      {/* ── Hamburger (mobile only — hidden on desktop via CSS) ── */}
      <motion.button
        className="navbar-hamburger"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={_onMenuClick}
        title="Open menu"
        style={{
          display: 'none', // shown on mobile via .navbar-hamburger CSS class
          background: 'rgba(99,102,241,0.08)',
          border: `1px solid rgba(99,102,241,0.22)`,
          borderRadius: 10,
          color: '#94a3b8',
          cursor: 'pointer',
          width: 38,
          height: 38,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Menu size={18} />
      </motion.button>

      {/* ── Spacer — pushes bell+avatar to right on desktop ── */}
      <div style={{ flex: 1 }} />

      {/* ── Notification bell ── */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleBellClick}
          title="Notifications"
          style={{
            position: 'relative',
            background: notifOpen ? `${T.cyan}18` : `rgba(0,0,0,0.02)`,
            border: `1px solid ${notifOpen ? T.cyan + '40' : T.border}`,
            borderRadius: 10,
            color: notifOpen ? T.cyan : T.sub,
            cursor: 'pointer',
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          }}
        >
          <Bell size={16} />
          {/* Unread badge */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                boxShadow: '0 0 8px rgba(99,102,241,0.6)',
                border: `1.5px solid ${isLight ? '#fff' : 'rgba(6,7,20,0.9)'}`,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </motion.button>

        {/* Notification Dropdown */}
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              className="notif-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: 360,
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: 480,
                background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(9,10,26,0.98)',
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 200,
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid rgba(99,102,241,0.12)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} color="#818cf8" />
                  <span style={{
                    fontFamily: 'var(--font-body,Inter)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#e2e8f0',
                  }}>
                    Notifications
                  </span>
                  {notifications.length > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: 'rgba(99,102,241,0.18)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.25)',
                    }}>
                      {notifications.length}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Clear all */}
                  {notifications.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleClearAll}
                      title="Clear all notifications"
                      style={{
                        background: 'none',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: 'var(--font-body,Inter)',
                        fontWeight: 600,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                    >
                      <Trash2 size={11} />
                      Clear all
                    </motion.button>
                  )}
                  {/* Refresh */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={fetchNotifications}
                    title="Refresh"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                      borderRadius: 6,
                    }}
                  >
                    <RefreshCw size={13} style={{ animation: notifLoading ? 'spin 1s linear infinite' : 'none' }} />
                  </motion.button>
                </div>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifLoading && notifications.length === 0 && (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: 13,
                    fontFamily: 'var(--font-body,Inter)',
                  }}>
                    <RefreshCw size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                    Loading…
                  </div>
                )}

                {notifError && (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#ef4444',
                    fontSize: 12,
                    fontFamily: 'var(--font-body,Inter)',
                  }}>
                    {notifError}
                  </div>
                )}

                {!notifLoading && !notifError && notifications.length === 0 && (
                  <div style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: 13,
                    fontFamily: 'var(--font-body,Inter)',
                  }}>
                    <Bell size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                    No notifications yet
                  </div>
                )}
                <AnimatePresence>
                {notifications.map((n) => (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '10px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'default',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                      const btn = e.currentTarget.querySelector('.notif-dismiss') as HTMLElement;
                      if (btn) btn.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      const btn = e.currentTarget.querySelector('.notif-dismiss') as HTMLElement;
                      if (btn) btn.style.opacity = '0';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: notifColor(n),
                      border: `1px solid ${notifBorder(n)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {notifIcon(n)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-body,Inter)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#e2e8f0',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {eventLabel(n)}
                      </p>
                      {n.repositoryFullName && (
                        <p style={{
                          fontFamily: 'var(--font-mono,Fira Code)',
                          fontSize: 10,
                          color: '#818cf8',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {n.repositoryFullName}
                          {n.pullRequestNumber ? ` #${n.pullRequestNumber}` : ''}
                        </p>
                      )}
                      {n.failureReason && (
                        <p style={{
                          fontFamily: 'var(--font-mono,Fira Code)',
                          fontSize: 10,
                          color: '#ef4444',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {n.failureReason}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Clock size={9} color="#475569" />
                        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'var(--font-mono,Fira Code)' }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Per-item dismiss button */}
                    <motion.button
                      className="notif-dismiss"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => handleDismiss(n._id, e)}
                      title="Dismiss"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 10,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5,
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        padding: 0,
                        opacity: 0,
                        transition: 'opacity 0.15s, background 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      <X size={10} />
                    </motion.button>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User avatar + dropdown ── */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setDropdownOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: '5px 10px 5px 5px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)'; }}
        >
          <Avatar src={user?.avatarUrl} name={user?.login ?? 'User'} size={28} />
          <span
            className="navbar-username"
            style={{
              fontFamily: 'var(--font-body,Inter)',
              fontSize: 13,
              fontWeight: 500,
              color: T.text,
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.login ?? 'User'}
          </span>
          <ChevronDown
            className="navbar-chevron"
            size={13}
            color={T.sub}
            style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          />
        </motion.button>

        {/* User dropdown */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              className="user-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: 190,
                maxWidth: 'calc(100vw - 16px)',
                background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(9,10,26,0.98)',
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                backdropFilter: 'blur(14px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                zIndex: 200,
              }}
            >
              {/* User info */}
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                <p style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body,Inter)' }}>
                  {user?.login}
                </p>
                <p style={{ color: T.sub, fontSize: 11, marginTop: 2, fontFamily: 'var(--font-body,Inter)' }}>
                  {user?.email}
                </p>
              </div>

              <div style={{ padding: '6px' }}>
                <DropdownItem
                  icon={<User size={14} />}
                  label="Settings"
                  onClick={() => { setDropdownOpen(false); navigate(ROUTES.SETTINGS); }}
                />
                <DropdownItem
                  icon={<LogOut size={14} />}
                  label="Sign out"
                  onClick={handleLogout}
                  danger
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

// ─── Dropdown item helper ──────────────────────────────────────────────────────
interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      background: 'transparent',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      color: danger ? '#f87171' : '#cbd5e1',
      fontSize: 13,
      fontFamily: 'var(--font-body,Inter)',
      textAlign: 'left',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = danger
        ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)';
    }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    {icon}
    {label}
  </button>
);

export default Navbar;
