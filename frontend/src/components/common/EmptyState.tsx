/**
 * @file components/common/EmptyState.tsx
 * @description Friendly placeholder shown when a list or section has no data.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Icon size={26} color="#6366f1" opacity={0.7} />
        </div>
      )}

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          color: '#e2e8f0',
          margin: 0,
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'rgba(148,163,184,0.6)',
            maxWidth: 340,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
