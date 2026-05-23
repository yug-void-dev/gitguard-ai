/**
 * @file components/reviews/FindingCard.tsx
 * @description Displays a single AI-generated code finding with file, line,
 * severity, message and suggested fix. Used inside ReviewDetailPage.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Lightbulb } from 'lucide-react';
import type { ReviewFinding } from '../../types/review.types';
import SeverityTag from './SeverityTag';
import { truncatePath } from '../../utils/truncateText';

interface FindingCardProps {
  finding: ReviewFinding;
  index: number;
}

const FindingCard: React.FC<FindingCardProps> = ({ finding, index }) => {
  const [expanded, setExpanded] = useState(index < 3); // first 3 open by default

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.6)',
        border: '1px solid rgba(99,102,241,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.12)')
      }
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {expanded ? (
          <ChevronDown size={14} color="#64748b" />
        ) : (
          <ChevronRight size={14} color="#64748b" />
        )}

        <SeverityTag severity={finding.severity} />

        {/* File + line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <FileCode size={12} color="#64748b" />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncatePath(finding.file, 3)}
            {finding.line > 0 && `:${finding.line}`}
          </span>
        </div>

        {/* Confidence */}
        <span
          style={{
            fontSize: 10,
            color: 'rgba(148,163,184,0.4)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {Math.round(finding.confidence * 100)}% conf
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '1px solid rgba(99,102,241,0.08)',
          }}
        >
          {/* Message */}
          <p
            style={{
              fontSize: 13,
              color: '#e2e8f0',
              margin: '12px 0 10px',
              lineHeight: 1.6,
              fontFamily: 'var(--font-body)',
            }}
          >
            {finding.message}
          </p>

          {/* Suggestion */}
          {finding.suggestion && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <Lightbulb size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(203,213,225,0.8)',
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: 'var(--font-body)',
                }}
              >
                <strong style={{ color: '#fbbf24', fontWeight: 600 }}>Fix: </strong>
                {finding.suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FindingCard;
