import React from 'react';
import { motion } from 'framer-motion';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  muted: '#475569',
  text: '#e2e8f0',
};

// ─── Activity chart ───────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  VALS = [12, 19, 8, 25, 31, 14, 7],
  MV = Math.max(...VALS);

export function DashboardActivityChart() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 5,
        height: 72,
        width: '100%',
      }}
    >
      {DAYS.map((d, i) => (
        <div
          key={d}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${(VALS[i] / MV) * 56}px`, opacity: 1 }}
            transition={{
              duration: 0.65,
              delay: 0.25 + i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ filter: 'brightness(1.4)', scaleX: 1.1 }}
            style={{
              width: '100%',
              borderRadius: '3px 3px 2px 2px',
              minHeight: 3,
              cursor: 'pointer',
              background:
                i === 4
                  ? `linear-gradient(180deg,${T.cyan},${T.violet})`
                  : `linear-gradient(180deg,rgba(6,182,212,0.45),rgba(129,140,248,0.3))`,
              boxShadow: i === 4 ? `0 0 8px ${T.cyan}45` : 'none',
            }}
          />
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 8,
              color: T.muted,
            }}
          >
            {d}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Health ring ──────────────────────────────────────────────────────────────
export function DashboardHealthRing({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const r = 24,
    circ = 2 * Math.PI * r;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 11,
              fontWeight: 800,
              color: T.text,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <span
        style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          color: T.muted,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}
