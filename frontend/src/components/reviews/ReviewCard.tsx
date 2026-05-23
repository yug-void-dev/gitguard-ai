/**
 * @file components/reviews/ReviewCard.tsx
 * @description Summary card for a single review shown in the Reviews list page.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, Shield, Gauge, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Review } from '../../types/review.types';
import Badge, { statusVariant } from '../common/Badge';
import { formatRelativeTime } from '../../utils/formatDate';
import { truncateText } from '../../utils/truncateText';
import { ROUTES } from '../../constants/routes';
import { SEVERITY_HEX } from '../../constants/severity';

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const navigate = useNavigate();

  const highCount = review.findings.filter((f) => f.severity === 'high').length;
  const medCount = review.findings.filter((f) => f.severity === 'medium').length;

  return (
    <button
      onClick={() => navigate(ROUTES.REVIEW_DETAIL(review.id))}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 14,
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(99,102,241,0.4)';
        el.style.background = 'rgba(10,11,30,0.9)';
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(99,102,241,0.15)';
        el.style.background = 'rgba(10,11,30,0.7)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Row 1: repo + status + time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(99,102,241,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GitPullRequest size={14} color="#818cf8" />
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(148,163,184,0.6)',
                display: 'block',
              }}
            >
              {review.repository.fullName}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13.5,
                fontWeight: 600,
                color: '#e2e8f0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {truncateText(review.prTitle, 60)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Badge variant={statusVariant(review.status)} dot={review.status === 'pending'}>
            {review.status}
          </Badge>
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', fontFamily: 'var(--font-mono)' }}>
            {formatRelativeTime(review.createdAt)}
          </span>
        </div>
      </div>

      {/* Row 2: metrics */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          borderTop: '1px solid rgba(99,102,241,0.08)',
          paddingTop: 12,
        }}
      >
        <Metric icon={<Shield size={12} color="#f87171" />} label="High" value={highCount} color="#f87171" />
        <Metric icon={<AlertTriangle size={12} color="#fbbf24" />} label="Med" value={medCount} color="#fbbf24" />
        <Metric
          icon={<Gauge size={12} color="#34d399" />}
          label="Score"
          value={`${review.metrics.codeQualityScore ?? 0}/100`}
          color="#34d399"
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)' }}>Details</span>
          <ArrowRight size={12} color="#6366f1" />
        </div>
      </div>
    </button>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({
  icon, label, value, color,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {icon}
    <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-body)' }}>{label}:</span>
    <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
  </div>
);

export default ReviewCard;
