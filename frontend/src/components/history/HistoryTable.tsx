/**
 * @file components/history/HistoryTable.tsx
 * @description Paginated table of all PR reviews for the History page.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { Review } from '../../types/review.types';
import Badge, { statusVariant } from '../common/Badge';
import SeverityTag from '../reviews/SeverityTag';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { formatDateTime } from '../../utils/formatDate';
import { truncateText } from '../../utils/truncateText';
import { ROUTES } from '../../constants/routes';
import { History } from 'lucide-react';

interface HistoryTableProps {
  reviews: Review[];
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

const TH: React.CSSProperties = {
  padding: '10px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(148,163,184,0.6)',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.7,
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
  borderBottom: '1px solid rgba(99,102,241,0.1)',
};

const TD: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12.5,
  color: '#e2e8f0',
  fontFamily: 'var(--font-body)',
  verticalAlign: 'middle' as const,
  borderBottom: '1px solid rgba(99,102,241,0.06)',
};

const HistoryTable: React.FC<HistoryTableProps> = ({
  reviews,
  totalPages,
  currentPage,
  isLoading,
  onPageChange,
}) => {
  const navigate = useNavigate();

  // Highest severity per review
  const topSeverity = (r: Review): string => {
    const order = ['high', 'medium', 'low', 'info'];
    for (const sev of order) {
      if (r.findings.some((f) => f.severity === sev)) return sev;
    }
    return 'info';
  };

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
          <Spinner size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={History}
          title="No reviews found"
          description="Adjust your filters or connect a repository to start getting PR reviews."
        />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Repository <ArrowUpDown size={10} />
                    </span>
                  </th>
                  <th style={TH}>PR</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Top Severity</th>
                  <th style={TH}>Findings</th>
                  <th style={TH}>Score</th>
                  <th style={TH}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Date <ArrowUpDown size={10} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    onClick={() => navigate(ROUTES.REVIEW_DETAIL(review.id))}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'transparent')
                    }
                  >
                    <td style={TD}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94a3b8' }}>
                          {review.repository.fullName}
                        </span>
                      </div>
                    </td>
                    <td style={TD}>
                      <div>
                        <span style={{ fontWeight: 600 }}>#{review.prNumber}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {truncateText(review.prTitle, 40)}
                        </span>
                      </div>
                    </td>
                    <td style={TD}>
                      <Badge variant={statusVariant(review.status)}>{review.status}</Badge>
                    </td>
                    <td style={TD}>
                      {review.findings.length > 0 ? (
                        <SeverityTag severity={topSeverity(review)} />
                      ) : (
                        <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {review.findings.length}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                      {review.metrics.codeQualityScore ?? '—'}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDateTime(review.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '12px 16px',
                borderTop: '1px solid rgba(99,102,241,0.1)',
              }}
            >
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-body)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                style={paginationBtn}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={paginationBtn}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const paginationBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(99,102,241,0.08)',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 8,
  color: '#818cf8',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

export default HistoryTable;
