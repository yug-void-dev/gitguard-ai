/**
 * @file components/dashboard/OverviewCard.tsx
 * @description Stat card showing a key metric (total reviews, vulns, score, etc.)
 * Used in a grid on the Dashboard page.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Spinner from '../common/Spinner';

interface OverviewCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  loading?: boolean;
  accentColor?: string; // hex or CSS colour
}

const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading = false,
  accentColor = '#6366f1',
}) => {
  const isPositive = trend ? trend.value >= 0 : null;

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        backdropFilter: 'blur(8px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}40`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${accentColor}15`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}20, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(148,163,184,0.7)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {title}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={17} color={accentColor} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <Spinner size={24} color={accentColor} />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            fontWeight: 800,
            color: '#f1f5f9',
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      )}

      {/* Subtitle / trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isPositive ? '#34d399' : '#f87171',
              background: isPositive ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
        {(subtitle || trend?.label) && (
          <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)' }}>
            {trend?.label ?? subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default OverviewCard;
