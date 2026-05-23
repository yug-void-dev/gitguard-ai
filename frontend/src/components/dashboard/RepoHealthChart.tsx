/**
 * @file components/dashboard/RepoHealthChart.tsx
 * @description Horizontal bar chart showing code quality scores per repository.
 * Built with pure SVG — no external chart dependency.
 */

import React, { useMemo } from 'react';
import type { Review } from '../../types/review.types';

interface RepoHealthChartProps {
  reviews: Review[];
}

interface RepoScore {
  name: string;
  score: number;
  reviews: number;
}

function buildRepoScores(reviews: Review[]): RepoScore[] {
  const map: Record<string, { total: number; count: number }> = {};
  for (const r of reviews) {
    const key = r.repository.fullName;
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += r.metrics.codeQualityScore ?? 0;
    map[key].count += 1;
  }
  return Object.entries(map)
    .map(([name, { total, count }]) => ({
      name: name.split('/')[1] ?? name,
      score: Math.round(total / count),
      reviews: count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
}

function scoreColor(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

const RepoHealthChart: React.FC<RepoHealthChartProps> = ({ reviews }) => {
  const repos = useMemo(() => buildRepoScores(reviews), [reviews]);

  if (repos.length === 0) {
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
        No repository data yet
      </div>
    );
  }

  const BAR_H = 20;
  const GAP = 10;
  const LABEL_W = 110;
  const SVG_W = 340;
  const BAR_W = SVG_W - LABEL_W - 50;
  const SVG_H = repos.length * (BAR_H + GAP);

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
        Repository Health Scores
      </h3>

      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ overflow: 'visible' }}
      >
        {repos.map((repo, i) => {
          const y = i * (BAR_H + GAP);
          const barWidth = Math.max(2, (repo.score / 100) * BAR_W);
          const color = scoreColor(repo.score);

          return (
            <g key={repo.name}>
              {/* Label */}
              <text
                x={LABEL_W - 8}
                y={y + BAR_H / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fill="rgba(203,213,225,0.7)"
                fontSize={11}
                fontFamily="var(--font-body)"
              >
                {repo.name.length > 14 ? repo.name.slice(0, 13) + '…' : repo.name}
              </text>

              {/* Background track */}
              <rect
                x={LABEL_W}
                y={y}
                width={BAR_W}
                height={BAR_H}
                rx={6}
                fill="rgba(255,255,255,0.04)"
              />

              {/* Score bar */}
              <rect
                x={LABEL_W}
                y={y}
                width={barWidth}
                height={BAR_H}
                rx={6}
                fill={color}
                opacity={0.8}
              />

              {/* Score label */}
              <text
                x={LABEL_W + BAR_W + 8}
                y={y + BAR_H / 2 + 1}
                dominantBaseline="middle"
                fill={color}
                fontSize={11}
                fontWeight={700}
                fontFamily="var(--font-mono)"
              >
                {repo.score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RepoHealthChart;
