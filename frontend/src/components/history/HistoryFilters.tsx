/**
 * @file components/history/HistoryFilters.tsx
 * @description Filter bar for the History page with date-range, status, and repo filters.
 */

import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import type { HistoryQueryParams } from '../../services/history.service';

interface HistoryFiltersProps {
  params: HistoryQueryParams;
  onChange: (params: HistoryQueryParams) => void;
  repositories?: string[];
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(10,11,30,0.8)',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 10,
  color: '#e2e8f0',
  fontSize: 12,
  padding: '7px 10px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
};

const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  params,
  onChange,
  repositories = [],
}) => {
  const hasActive =
    params.search ||
    (params.status && params.status !== 'all') ||
    params.repository ||
    params.dateFrom ||
    params.dateTo;

  const clear = () =>
    onChange({
      page: 1,
      limit: params.limit,
      status: 'all',
      repository: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
        <Search
          size={13}
          color="#64748b"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search PR title…"
          value={params.search ?? ''}
          onChange={(e) => onChange({ ...params, search: e.target.value || undefined, page: 1 })}
          style={{ ...INPUT_STYLE, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Status */}
      <select
        value={params.status ?? 'all'}
        onChange={(e) =>
          onChange({ ...params, status: e.target.value as HistoryQueryParams['status'], page: 1 })
        }
        style={{ ...INPUT_STYLE, cursor: 'pointer' }}
      >
        <option value="all">All Status</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>

      {/* Repository */}
      {repositories.length > 0 && (
        <select
          value={params.repository ?? ''}
          onChange={(e) =>
            onChange({ ...params, repository: e.target.value || undefined, page: 1 })
          }
          style={{ ...INPUT_STYLE, cursor: 'pointer' }}
        >
          <option value="">All Repos</option>
          {repositories.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {/* Date from */}
      <div style={{ position: 'relative' }}>
        <Calendar
          size={12}
          color="#64748b"
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="date"
          value={params.dateFrom ?? ''}
          onChange={(e) => onChange({ ...params, dateFrom: e.target.value || undefined, page: 1 })}
          style={{ ...INPUT_STYLE, paddingLeft: 26 }}
          title="From date"
        />
      </div>

      {/* Date to */}
      <div style={{ position: 'relative' }}>
        <Calendar
          size={12}
          color="#64748b"
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="date"
          value={params.dateTo ?? ''}
          onChange={(e) => onChange({ ...params, dateTo: e.target.value || undefined, page: 1 })}
          style={{ ...INPUT_STYLE, paddingLeft: 26 }}
          title="To date"
        />
      </div>

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

export default HistoryFilters;
