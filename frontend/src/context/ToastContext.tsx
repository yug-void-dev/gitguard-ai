/**
 * @file context/ToastContext.tsx
 * @description React Context and Hook for global Toastify notifications.
 * Renders glassmorphic toast alert cards with bouncy spring physics,
 * severity-matched glowing borders, icons, progress bars, and descriptive text.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, description?: string, duration?: number) => void;
    error: (title: string, description?: string, duration?: number) => void;
    info: (title: string, description?: string, duration?: number) => void;
    warning: (title: string, description?: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useMemo(
    () => ({
      success: (title: string, description?: string, duration?: number) => addToast('success', title, description, duration),
      error: (title: string, description?: string, duration?: number) => addToast('error', title, description, duration),
      info: (title: string, description?: string, duration?: number) => addToast('info', title, description, duration),
      warning: (title: string, description?: string, duration?: number) => addToast('warning', title, description, duration),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

// ─── Toast Container overlay ──────────────────────────────────────────────────
const ToastContainer: React.FC<{ toasts: ToastItem[]; removeToast: (id: string) => void }> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 390,
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ─── Individual Toast Card ────────────────────────────────────────────────────
const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const { type, title, description, duration = 5000 } = toast;

  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Style configurations based on severity
  const CONFIG = {
    success: {
      color: '#10b981', // Emerald
      glow: 'rgba(16,185,129,0.18)',
      border: 'rgba(16,185,129,0.35)',
      Icon: ShieldCheck,
    },
    error: {
      color: '#ef4444', // Red/Rose
      glow: 'rgba(239,68,68,0.18)',
      border: 'rgba(239,68,68,0.35)',
      Icon: ShieldAlert,
    },
    warning: {
      color: '#f59e0b', // Amber/Orange
      glow: 'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.35)',
      Icon: AlertTriangle,
    },
    info: {
      color: '#06b6d4', // Cyan/Blue
      glow: 'rgba(6,182,212,0.15)',
      border: 'rgba(6,182,212,0.35)',
      Icon: Info,
    },
  }[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.88, filter: 'blur(4px)', transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(8,9,24,0.94) 0%, rgba(13,15,36,0.92) 100%)',
        border: `1px solid ${CONFIG.border}`,
        boxShadow: `0 10px 30px -10px rgba(0,0,0,0.65), 0 0 16px ${CONFIG.glow}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '14px 16px',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Glowing Severity Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `${CONFIG.color}15`,
            border: `1px solid ${CONFIG.color}25`,
            color: CONFIG.color,
            flexShrink: 0,
            boxShadow: `0 0 10px ${CONFIG.color}35`,
          }}
        >
          <CONFIG.Icon size={18} strokeWidth={2.2} />
        </div>

        {/* Content Details */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <h4
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 13.5,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 3px 0',
              letterSpacing: '-0.1px',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h4>
          {description && (
            <p
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 11.5,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Manual Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            padding: 2,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#cbd5e1';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Underline Progress Bar countdown indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2.5,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          style={{
            height: '100%',
            background: CONFIG.color,
            boxShadow: `0 0 8px ${CONFIG.color}a0`,
          }}
        />
      </div>
    </motion.div>
  );
};
