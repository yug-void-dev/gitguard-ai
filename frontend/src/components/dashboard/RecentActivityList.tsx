/**
 * @file components/dashboard/RecentActivityList.tsx
 * @description Shows the last N reviews as a compact activity list on the dashboard.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, ArrowRight } from 'lucide-react';
import { useReviews } from '../../hooks/useReviews';
import { formatRelativeTime } from '../../utils/formatDate';
import { truncateText } from '../../utils/truncateText';
import Badge, { statusVariant } from '../common/Badge';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { ROUTES } from '../../constants/routes';

const RecentActivityList: React.FC = () => {
  const navigate = useNavigate();
  const { reviews, isLoading } = useReviews({}, 6);

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitPullRequest size={15} color="#818cf8" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              color: '#e2e8f0',
            }}
          >
            Recent Reviews
          </span>
        </div>
        <button
          onClick={() => navigate(ROUTES.REVIEWS)}
          style={{
            background: 'none',
            border: 'none',
            color: '#818cf8',
            cursor: 'pointer',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-body)',
          }}
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '8px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="No reviews yet"
            description="Connect a repository and open a PR to trigger your first review."
          />
        ) : (
          reviews.map((review) => (
            <button
              key={review.id}
              onClick={() => navigate(ROUTES.REVIEW_DETAIL(review.id))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                marginBottom: 2,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              }}
            >
              {/* PR icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GitPullRequest size={14} color="#818cf8" />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truncateText(review.prTitle, 55)}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'rgba(148,163,184,0.5)',
                    margin: '2px 0 0',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {review.repository.fullName} · #{review.prNumber}
                </p>
              </div>

              {/* Right side */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <Badge variant={statusVariant(review.status)}>{review.status}</Badge>
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontFamily: 'var(--font-mono)' }}>
                  {formatRelativeTime(review.createdAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityList;
