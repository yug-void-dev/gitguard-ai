/**
 * @file components/dashboard/UsageAnalyticsTab.tsx
 * @description Renders token usage stats and billing charts.
 * Built with interactive SVG charts for sleek design, responsiveness, and zero dependency issues.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, DollarSign, Database, TrendingUp, Info, HelpCircle } from 'lucide-react';
import api from '../../services/api';
import { T } from '../../constants/theme';

interface DailyUsage {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Generate realistic mock data for past 7 days as fail-safe fallback
const GENERATE_MOCK_DATA = (): DailyUsage[] => {
  const data: DailyUsage[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    // Random but realistic numbers
    const prompt = Math.round(15000 + Math.random() * 25000);
    const completion = Math.round(5000 + Math.random() * 12000);
    const total = prompt + completion;
    // Cost calculation: $0.075/1M prompt, $0.30/1M completion (roughly Gemini 1.5 Flash rates)
    const cost = Number(((prompt / 1000000) * 0.075 + (completion / 1000000) * 0.30).toFixed(4));

    data.push({
      date: dateStr,
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
      estimatedCost: cost,
    });
  }
  return data;
};

export const UsageAnalyticsTab: React.FC = () => {
  const [data, setData] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeMetric, setActiveMetric] = useState<'tokens' | 'cost'>('tokens');

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analytics/usage');
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setData(response.data.data);
        setIsDemoMode(false);
      } else {
        throw new Error('Invalid server data format');
      }
    } catch (err) {
      console.warn('Analytics API not available. Using local client telemetry fallback.', err);
      setData(GENERATE_MOCK_DATA());
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, curr) => {
        acc.prompt += curr.promptTokens;
        acc.completion += curr.completionTokens;
        acc.total += curr.totalTokens;
        acc.cost += curr.estimatedCost;
        return acc;
      },
      { prompt: 0, completion: 0, total: 0, cost: 0 }
    );
  }, [data]);

  // Chart configuration
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  // Max values for scaling
  const maxTokens = useMemo(() => Math.max(...data.map(d => d.totalTokens), 1), [data]);
  const maxCost = useMemo(() => Math.max(...data.map(d => d.estimatedCost), 0.01), [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Demo / Offline Mode Notice */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 10,
            fontSize: 12,
            color: T.violet,
          }}
        >
          <Info size={14} color={T.violet} />
          <span>
            <strong>Simulated Telemetry:</strong> Offline client mode active. Displaying local simulated API usage statistics.
          </span>
        </motion.div>
      )}

      {/* Aggregate Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {/* Total Tokens */}
        <div
          style={{
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.cyan,
            }}
          >
            <Coins size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Tokens Used
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginTop: 2, fontFamily: 'monospace' }}>
              {totals.total.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              {totals.prompt.toLocaleString()} prompt / {totals.completion.toLocaleString()} completion
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
        <div
          style={{
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.green,
            }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estimated API Cost
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginTop: 2, fontFamily: 'monospace' }}>
              ${totals.cost.toFixed(3)}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              Based on active model token weights
            </div>
          </div>
        </div>

        {/* Avg Cost per 1k */}
        <div
          style={{
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(129,140,248,0.08)',
              border: '1px solid rgba(129,140,248,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.violet,
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cost / 100K Tokens
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginTop: 2, fontFamily: 'monospace' }}>
              ${totals.total > 0 ? ((totals.cost / totals.total) * 100000).toFixed(4) : '0.0000'}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              Efficiency metric across providers
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Panel */}
      <div
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Daily Usage Trends</h3>
            <p style={{ fontSize: 12, color: T.sub }}>Click metrics below to toggle between views</p>
          </div>
          <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 3, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <button
              onClick={() => setActiveMetric('tokens')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: activeMetric === 'tokens' ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: activeMetric === 'tokens' ? T.cyan : T.sub,
                border: activeMetric === 'tokens' ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Token Usage
            </button>
            <button
              onClick={() => setActiveMetric('cost')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: activeMetric === 'cost' ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: activeMetric === 'cost' ? T.green : T.sub,
                border: activeMetric === 'cost' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              API Costs
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyItems: 'center', color: T.sub, width: '100%' }}>
            Fetching analytics logs...
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%' }}>
            {/* SVG Chart */}
            <svg
              width="100%"
              height={chartHeight + 40}
              style={{ overflow: 'visible' }}
            >
              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                const y = paddingY + (1 - r) * (chartHeight - paddingY * 2);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2="96%"
                      y2={y}
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="rgba(148,163,184,0.3)"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {activeMetric === 'tokens'
                        ? `${Math.round((maxTokens * r) / 1000)}k`
                        : `$${(maxCost * r).toFixed(2)}`}
                    </text>
                  </g>
                );
              })}

              {/* Data Items */}
              {data.map((day, i) => {
                const totalWidth = 90; // percentage limits
                const leftPercent = paddingX + (i * (90 - paddingX)) / (data.length - 1);
                
                // SVG coordinates mapping
                const x = `${paddingX + (i * (92 - paddingX)) / (data.length - 1)}%`;
                const rawX = paddingX + (i * (92 - paddingX)) / (data.length - 1); // numeric representation

                const formattedDate = new Date(day.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                if (activeMetric === 'tokens') {
                  // Stacked Bar Chart for Tokens
                  const promptH = (day.promptTokens / maxTokens) * (chartHeight - paddingY * 2);
                  const compH = (day.completionTokens / maxTokens) * (chartHeight - paddingY * 2);
                  const totalH = promptH + compH;
                  const y = chartHeight - paddingY - totalH;

                  return (
                    <g key={day.date}>
                      {/* Interactive hover column */}
                      <rect
                        x={`${rawX - 3.5}%`}
                        y={paddingY}
                        width="7%"
                        height={chartHeight - paddingY * 2}
                        fill="transparent"
                        cursor="pointer"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Prompt Tokens segment (bottom bar) */}
                      <motion.rect
                        initial={{ height: 0, y: chartHeight - paddingY }}
                        animate={{ height: promptH, y: chartHeight - paddingY - promptH }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        x={`${rawX - 2}%`}
                        width="4%"
                        fill="rgba(99,102,241,0.5)" // Semi-transparent Indigo
                        stroke="rgba(99,102,241,0.8)"
                        strokeWidth="0.5"
                        rx="1"
                      />

                      {/* Completion Tokens segment (top bar) */}
                      <motion.rect
                        initial={{ height: 0, y: chartHeight - paddingY }}
                        animate={{ height: compH, y: chartHeight - paddingY - totalH }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        x={`${rawX - 2}%`}
                        width="4%"
                        fill="rgba(6,182,212,0.7)" // Cyan
                        stroke="rgba(6,182,212,0.9)"
                        strokeWidth="0.5"
                        rx="1"
                      />

                      {/* Hover Overlay Highlight */}
                      {hoveredIdx === i && (
                        <rect
                          x={`${rawX - 2.5}%`}
                          y={y - 2}
                          width="5%"
                          height={totalH + 4}
                          fill="transparent"
                          stroke={T.cyan}
                          strokeWidth="1"
                          rx="2"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      {/* X Axis Label */}
                      <text
                        x={x}
                        y={chartHeight + 15}
                        textAnchor="middle"
                        fill={hoveredIdx === i ? T.cyan : 'rgba(148,163,184,0.4)'}
                        fontSize="9"
                        fontWeight={hoveredIdx === i ? '700' : 'normal'}
                      >
                        {formattedDate}
                      </text>
                    </g>
                  );
                } else {
                  // Area / Line Chart for Cost
                  const h = (day.estimatedCost / maxCost) * (chartHeight - paddingY * 2);
                  const y = chartHeight - paddingY - h;

                  // Next point for line path
                  const nextDay = data[i + 1];
                  let nextLine = null;
                  if (nextDay) {
                    const nextH = (nextDay.estimatedCost / maxCost) * (chartHeight - paddingY * 2);
                    const nextX = `${paddingX + ((i + 1) * (92 - paddingX)) / (data.length - 1)}%`;
                    const nextY = chartHeight - paddingY - nextH;
                    nextLine = { x2: nextX, y2: nextY };
                  }

                  return (
                    <g key={day.date}>
                      {/* Interactive hover column */}
                      <rect
                        x={`${rawX - 3.5}%`}
                        y={paddingY}
                        width="7%"
                        height={chartHeight - paddingY * 2}
                        fill="transparent"
                        cursor="pointer"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Line segment connect */}
                      {nextLine && (
                        <line
                          x1={x}
                          y1={y}
                          x2={nextLine.x2}
                          y2={nextLine.y2}
                          stroke={T.green}
                          strokeWidth="2"
                          opacity="0.8"
                        />
                      )}

                      {/* Node circle */}
                      <motion.circle
                        initial={{ scale: 0 }}
                        animate={{ scale: hoveredIdx === i ? 6 : 4 }}
                        x={x}
                        y={y}
                        cx="0"
                        cy="0"
                        r="1"
                        fill={hoveredIdx === i ? '#ffffff' : T.green}
                        stroke={T.green}
                        strokeWidth="2"
                        cursor="pointer"
                      />

                      {/* X Axis Label */}
                      <text
                        x={x}
                        y={chartHeight + 15}
                        textAnchor="middle"
                        fill={hoveredIdx === i ? T.green : 'rgba(148,163,184,0.4)'}
                        fontSize="9"
                        fontWeight={hoveredIdx === i ? '700' : 'normal'}
                      >
                        {formattedDate}
                      </text>
                    </g>
                  );
                }
              })}
            </svg>

            {/* Floating Details Tooltip */}
            <AnimatePresence>
              {hoveredIdx !== null && data[hoveredIdx] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10,12,30,0.95)',
                    border: `1px solid ${activeMetric === 'tokens' ? T.cyan : T.green}`,
                    boxShadow: `0 8px 30px ${activeMetric === 'tokens' ? T.cyan + '20' : T.green + '20'}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, fontFamily: 'monospace' }}>
                    {new Date(data[hoveredIdx].date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>Prompt</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {data[hoveredIdx].promptTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>Completion</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.cyan }}>
                        {data[hoveredIdx].completionTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>Cost</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>
                        ${data[hoveredIdx].estimatedCost.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom info section */}
      <div style={{ background: 'rgba(0,0,0,0.18)', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <HelpCircle size={18} color={T.cyan} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>How are costs estimated?</div>
          <p style={{ fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.45 }}>
            Token cost represents model API pricing computed from prompt input weight vs completion output weight. When using external providers (Gemini or Groq), calculation follows official developer pricing structures. Local Ollama/vLLM endpoints are estimated at zero cost.
          </p>
        </div>
      </div>
    </div>
  );
};
