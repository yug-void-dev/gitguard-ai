/**
 * @file components/layout/PageHeader.tsx
 * @description Page-level header with title, subtitle, and optional action slot.
 * Used at the top of every protected page to provide consistent visual hierarchy.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

/**
 * PageHeader renders a consistent page title row.
 *
 * @example
 *   <PageHeader
 *     title="Repositories"
 *     subtitle="Manage connected GitHub repositories"
 *     icon={BookOpen}
 *     actions={<Button>Connect Repo</Button>}
 *   />
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, actions }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      {/* Left: icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {Icon && (
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.1))',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color="#818cf8" />
          </div>
        )}

        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: '#f1f5f9',
              letterSpacing: -0.5,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'rgba(148,163,184,0.6)',
                margin: '3px 0 0',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: action buttons */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
