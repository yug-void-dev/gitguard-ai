import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GitPullRequest } from 'lucide-react';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  muted: '#475569',
  text: '#e2e8f0',
};

// ─── Sev badge ────────────────────────────────────────────────────────────────
const SEV: Record<string, [string, string]> = {
  Critical: [T.red, 'rgba(239,68,68,0.12)'],
  High: [T.orange, 'rgba(249,115,22,0.12)'],
  Medium: [T.amber, 'rgba(245,158,11,0.12)'],
  Low: [T.green, 'rgba(16,185,129,0.12)'],
};

export function DashboardSevBadge({ level }: { level: string }) {
  const [c, bg] = SEV[level] ?? [T.green, 'rgba(16,185,129,0.12)'];
  return (
    <span
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        padding: '3px 8px',
        borderRadius: 20,
        color: c,
        background: bg,
        border: `1px solid ${c}25`,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {level}
    </span>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────
export interface ReviewItem {
  repo: string;
  pr: string;
  title: string;
  severity: string;
  bugs: number;
  time: string;
}

export function DashboardReviewRow({
  item,
  delay,
}: {
  item: ReviewItem;
  delay: number;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ x: 3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        background: h ? 'rgba(6,182,212,0.05)' : 'transparent',
        border: `1px solid ${h ? 'rgba(6,182,212,0.15)' : 'transparent'}`,
        transition: 'background .18s,border-color .18s',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'rgba(129,140,248,0.1)',
          border: '1px solid rgba(129,140,248,0.18)',
        }}
      >
        <GitPullRequest size={12} style={{ color: T.violet }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
            marginBottom: 1,
          }}
        >
          {item.repo} <span style={{ color: T.cyan }}>{item.pr}</span>
        </p>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: T.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {item.title}
        </p>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
      >
        <DashboardSevBadge level={item.severity} />
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
            minWidth: 36,
            textAlign: 'right' as const,
          }}
        >
          {item.time} ago
        </span>
      </div>
    </motion.div>
  );
}
