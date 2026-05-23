import React, { useState } from 'react';
import { motion } from 'framer-motion';

const T = {
  panel: 'rgba(255,255,255,0.032)',
  panelHov: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  sub: '#94a3b8',
  muted: '#475569',
  violet: '#818cf8',
};

// ─── Section heading ──────────────────────────────────────────────────────────
export function DashboardSHead({
  label,
  accent,
  right,
  inline,
}: {
  label: string;
  accent: string;
  right?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        marginBottom: inline ? 0 : 14,
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: `linear-gradient(to bottom,${accent},${T.violet})`,
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: T.muted,
          flex: 1,
        }}
      >
        {label}
      </h2>
      {right}
    </div>
  );
}

// ─── Quick Action card ────────────────────────────────────────────────────────
export function DashboardQuickAction({
  icon: Icon,
  title,
  sub,
  color,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  color: string;
  onClick?: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        width: '100%',
        textAlign: 'left',
        background: h ? T.panelHov : T.panel,
        border: `1px solid ${h ? color + '30' : T.border}`,
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}14`,
          border: `1px solid ${color}22`,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: T.text,
            marginBottom: 2,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
          }}
        >
          {sub}
        </p>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.border}`,
          color: T.muted,
          flexShrink: 0,
        }}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </motion.button>
  );
}
