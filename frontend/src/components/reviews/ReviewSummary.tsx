/**
 * @file components/reviews/ReviewSummary.tsx
 * @description Summary panel for a single review — shows LLM-generated summary,
 * metrics bar, and finding counts grouped by severity.
 */

import React from 'react';
import { Shield, Gauge, Activity, FileSearch } from 'lucide-react';
import type { Review } from '../../types/review.types';
import SeverityTag from './SeverityTag';
import { SEVERITY_LEVELS, SEVERITY_HEX } from '../../constants/severity';

interface ReviewSummaryProps {
  review: Review;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ review }) => {
  const { metrics, findings, summary } = review;

  // Count findings per severity
  const countBySeverity: Record<string, number> = {};
  for (const f of findings) {
    countBySeverity[f.severity] = (countBySeverity[f.severity] ?? 0) + 1;
  }

  const score = metrics.codeQualityScore ?? 0;
  const scoreColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        padding: '20px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: 12 }}>
        <MetricTile
          icon={<Gauge size={16} color={scoreColor} />}
          label="Quality Score"
          value={`${score}/100`}
          color={scoreColor}
        />
        <MetricTile
          icon={<Shield size={16} color="#f87171" />}
          label="Vulnerabilities"
          value={metrics.vulnerabilitiesCount}
          color="#f87171"
        />
        <MetricTile
          icon={<Activity size={16} color="#fbbf24" />}
          label="Perf Issues"
          value={metrics.performanceIssuesCount}
          color="#fbbf24"
        />
      </div>

      {/* Severity breakdown */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(148,163,184,0.5)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Findings Breakdown
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SEVERITY_LEVELS.map((sev) => {
            const count = countBySeverity[sev] ?? 0;
            return (
              <div
                key={sev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: `${SEVERITY_HEX[sev]}12`,
                  border: `1px solid ${SEVERITY_HEX[sev]}30`,
                  borderRadius: 8,
                  padding: '5px 10px',
                }}
              >
                <SeverityTag severity={sev} size="sm" />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: SEVERITY_HEX[sev],
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <FileSearch size={13} color="#818cf8" />
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(148,163,184,0.5)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                margin: 0,
              }}
            >
              AI Summary
            </p>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'rgba(203,213,225,0.8)',
              lineHeight: 1.7,
              margin: 0,
              background: 'rgba(99,102,241,0.05)',
              border: '1px solid rgba(99,102,241,0.1)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            {summary}
          </p>
        </div>
      )}
    </div>
  );
};

const MetricTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(99,102,241,0.1)',
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'rgba(148,163,184,0.5)',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </span>
    </div>
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 800,
        color,
        letterSpacing: -0.5,
        lineHeight: 1,
      }}
    >
      {value}
    </span>
  </div>
);

export default ReviewSummary;
