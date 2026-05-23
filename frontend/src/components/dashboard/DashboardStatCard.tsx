import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  bg: '#060a14',
  panel: 'rgba(255,255,255,0.032)',
  panelHov: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  sub: '#94a3b8',
  muted: '#475569',
  dim: '#1e293b',
};

// ─── Counter ──────────────────────────────────────────────────────────────────
export function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = to / 90;
    const id = setInterval(() => {
      c += step;
      if (c >= to) {
        setV(to);
        clearInterval(id);
      } else setV(Math.floor(c));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [to]);
  return <>{v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay?: number;
  trend?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setH(true)}
      onHoverEnd={() => setH(false)}
      whileHover={{ y: -4, scale: 1.02 }}
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: '18px 20px',
        overflow: 'hidden',
        cursor: 'default',
        minWidth: 0,
        background: h
          ? `linear-gradient(135deg,${color}12,rgba(255,255,255,0.04))`
          : T.panel,
        border: `1px solid ${h ? color + '35' : T.border}`,
        transition: 'border-color .2s,background .2s',
      }}
    >
      {/* glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 14,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at 20% 20%,${color}14,transparent 65%)`,
          opacity: h ? 1 : 0,
          transition: 'opacity .2s',
        }}
      />
      {/* top shimmer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg,transparent,${color}65,transparent)`,
          opacity: h ? 1 : 0.25,
          transition: 'opacity .2s',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
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
            border: `1px solid ${color}25`,
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        {trend && (
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 20,
              background: `${T.green}14`,
              color: T.green,
              border: `1px solid ${T.green}25`,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <TrendingUp size={8} />
            {trend}
          </span>
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 26,
            fontWeight: 800,
            color: T.text,
            letterSpacing: '-1px',
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          <Counter to={value} />
        </p>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: T.muted,
            marginBottom: sub ? 3 : 0,
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: 10,
              color: T.muted,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}
