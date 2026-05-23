/**
 * @file components/dashboard/SeverityPieChart.tsx
 * @description SVG donut chart showing the distribution of finding severities.
 * Pure SVG — no external chart library needed.
 */

import React, { useMemo } from 'react';
import { SEVERITY_LEVELS, SEVERITY_HEX, SEVERITY_LABELS } from '../../constants/severity';
import type { Review } from '../../types/review.types';

interface SeverityPieChartProps {
  reviews: Review[];
}

interface Slice {
  severity: string;
  count: number;
  color: string;
  label: string;
}

function buildSlices(reviews: Review[]): Slice[] {
  const counts: Record<string, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const r of reviews) {
    for (const f of r.findings) {
      counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    }
  }
  return SEVERITY_LEVELS.map((sev) => ({
    severity: sev,
    count: counts[sev],
    color: SEVERITY_HEX[sev],
    label: SEVERITY_LABELS[sev],
  })).filter((s) => s.count > 0);
}

const SIZE = 140;
const R = 52;
const CX = SIZE / 2;
const CY = SIZE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

const SeverityPieChart: React.FC<SeverityPieChartProps> = ({ reviews }) => {
  const slices = useMemo(() => buildSlices(reviews), [reviews]);
  const total = slices.reduce((s, c) => s + c.count, 0);

  if (total === 0) {
    return (
      <div
        style={{
          background: 'rgba(10,11,30,0.7)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 16,
          padding: '20px',
          backdropFilter: 'blur(8px)',
          textAlign: 'center',
          color: 'rgba(148,163,184,0.4)',
          fontSize: 13,
        }}
      >
        No findings yet
      </div>
    );
  }

  let currentAngle = 0;
  const arcs = slices.map((s) => {
    const angle = (s.count / total) * 360;
    const arc = { ...s, startAngle: currentAngle, endAngle: currentAngle + angle - 1 };
    currentAngle += angle;
    return arc;
  });

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16,
        padding: '18px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: '#e2e8f0',
          marginBottom: 16,
        }}
      >
        Finding Severity Distribution
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Donut */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
          {arcs.map((arc) => (
            <path
              key={arc.severity}
              d={describeArc(CX, CY, R, arc.startAngle, arc.endAngle)}
              fill="none"
              stroke={arc.color}
              strokeWidth={18}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
          {/* Centre text */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            fill="#f1f5f9"
            fontSize={22}
            fontWeight={800}
            fontFamily="var(--font-display)"
          >
            {total}
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            fill="rgba(148,163,184,0.5)"
            fontSize={9}
            fontFamily="var(--font-mono)"
            letterSpacing={1}
          >
            FINDINGS
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {arcs.map((arc) => (
            <div key={arc.severity} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: arc.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: '#cbd5e1', fontFamily: 'var(--font-body)' }}>
                {arc.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: arc.color,
                  fontFamily: 'var(--font-mono)',
                  marginLeft: 'auto',
                  paddingLeft: 12,
                }}
              >
                {arc.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeverityPieChart;
