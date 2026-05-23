/**
 * @file components/reviews/ReviewFilters.tsx
 * @description Filter bar for the Reviews list page.
 * Provides status, severity, repository, and text search filters.
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import type { ReviewFilters } from '../../hooks/useReviews';

interface ReviewFiltersProps {
  filters: ReviewFilters;
  onChange: (filters: ReviewFilters) => void;
  repositories?: string[];
}

const SELECT_STYLE: React.CSSProperties = {
  background: 'rgba(10,11,30,0.8)',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 10,
  color: '#e2e8f0',
  fontSize: 12,
  padding: '7px 28px 7px 10px',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
};

const ReviewFiltersBar: React.FC<ReviewFiltersProps> = ({
  filters,
  onChange,
  repositories = [],
}) => {
  const hasActive =
    (filters.status && filters.status !== 'all') ||
    filters.severity ||
    filters.repository ||
    filters.search;

  const clear = () =>
    onChange({ status: 'all', severity: undefined, repository: undefined, search: undefined });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}
    >
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
        <Search
          size={13}
          color="#64748b"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search PR title…"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          style={{
            ...SELECT_STYLE,
            paddingLeft: 30,
            width: '100%',
          }}
        />
      </div>

      {/* Status */}
      <div style={{ position: 'relative' }}>
        <select
          value={filters.status ?? 'all'}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value as ReviewFilters['status'] })
          }
          style={SELECT_STYLE}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Severity */}
      <div style={{ position: 'relative' }}>
        <select
          value={filters.severity ?? ''}
          onChange={(e) =>
            onChange({ ...filters, severity: e.target.value || undefined })
          }
          style={SELECT_STYLE}
        >
          <option value="">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Repository */}
      {repositories.length > 0 && (
        <div style={{ position: 'relative' }}>
          <select
            value={filters.repository ?? ''}
            onChange={(e) =>
              onChange({ ...filters, repository: e.target.value || undefined })
            }
            style={SELECT_STYLE}
          >
            <option value="">All Repos</option>
            {repositories.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {/* Clear */}
      {hasActive && (
        <button
          onClick={clear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 10,
            color: '#f87171',
            fontSize: 12,
            padding: '7px 12px',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
};

export default ReviewFiltersBar;
