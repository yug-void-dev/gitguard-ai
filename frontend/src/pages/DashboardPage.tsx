import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  Bug,
  Zap,
  Shield,
  GitBranch,
  History,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { getReviews, getReviewStats, type ReviewStats } from '../services/review.service';
import type { Review } from '../types/review.types';
import { getQueueMetrics, type QueueMetricsResponse } from '../services/queue.service';
import { ROUTES } from '../constants/routes';
import { useWebSocket } from '../hooks/useWebSocket';

// Import extracted components
import { AppBackground } from '../components/layout/AppBackground';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { DashboardActivityChart, DashboardHealthRing } from '../components/dashboard/DashboardCharts';
import { DashboardTerminal } from '../components/dashboard/DashboardTerminal';
import { DashboardReviewRow } from '../components/dashboard/DashboardReviews';
import { DashboardQuickAction, DashboardSHead } from '../components/dashboard/DashboardQuickActions';
import SeverityPieChart from '../components/dashboard/SeverityPieChart';
import RepoHealthChart from '../components/dashboard/RepoHealthChart';
import { UsageAnalyticsTab } from '../components/dashboard/UsageAnalyticsTab';

const T = {
  bg: '#060a14',
  panel: 'rgba(255,255,255,0.032)',
  border: 'rgba(255,255,255,0.07)',
  text: '#e2e8f0',
  sub: '#94a3b8',
  cyan: '#06b6d4',
  violet: '#818cf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
  muted: '#475569',
};

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const DashboardPage: React.FC<{ user?: any }> = ({ user }) => {
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueMetricsResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing'>('overview');

  const { events } = useWebSocket(true);

  useEffect(() => {
    if (events.length > 0) {
      fetchData();
    }
  }, [events]);

  const fetchData = async () => {
    try {
      const [r, s, q] = await Promise.all([
        getReviews(1, 10),
        getReviewStats(),
        getQueueMetrics()
      ]);
      setReviews(r.reviews);
      setReviewStats(s);
      setQueueStats(q);
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const STATS = [
    {
      icon: GitPullRequest,
      label: 'PRs Analyzed',
      value: reviewStats?.totalReviews ?? queueStats?.counts?.completed ?? 0,
      sub: 'All time',
      color: T.cyan,
      trend: queueStats?.counts?.completed ? '+12%' : undefined,
      delay: 0,
    },
    {
      icon: Bug,
      label: 'Bugs Caught',
      value: reviewStats?.totalVulnerabilities ?? 0,
      sub: 'Total issues found',
      color: T.violet,
      trend: reviewStats ? '+8%' : undefined,
      delay: 0.07,
    },
    {
      icon: Zap,
      label: 'Avg Review (s)',
      value: 9,
      sub: '0.9s median',
      color: T.green,
      delay: 0.14,
    },
    {
      icon: Shield,
      label: 'Security Score',
      value: (reviewStats?.totalReviews || 0) > 0 ? Math.round(reviewStats!.averageScore) : 100,
      sub: 'Average quality',
      color: T.amber,
      trend: reviewStats ? '+2%' : undefined,
      delay: 0.21,
    },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
      {/* Background Effects — shared AppBackground */}
      <AppBackground />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ zIndex: 1, position: 'relative' }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: 24 }} className="dashboard-greeting">
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 'clamp(18px, 4vw, 24px)',
              fontWeight: 800,
              color: T.text,
              letterSpacing: '-0.5px',
              marginBottom: 6,
              lineHeight: 1.25,
            }}
          >
            {greet()},{' '}
            <span style={{ color: T.cyan }}>
              {user?.login || 'Sentinel'}
            </span>{' '}
            👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 13,
              color: T.sub,
              lineHeight: 1.45,
            }}
          >
            Here's what's happening with GitGuard AI today.
          </motion.p>
        </div>

        {/* Dashboard Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginBottom: 24,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 2,
          }}
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'billing', label: 'Billing & Usage' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? T.cyan : T.sub,
                  padding: '10px 4px',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Inter',sans-serif",
                  cursor: 'pointer',
                  position: 'relative',
                  outline: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="dashboard-tab-indicator"
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: T.cyan,
                      boxShadow: `0 0 10px ${T.cyan}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stat cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {STATS.map((s) => (
                  <DashboardStatCard key={s.label} {...s} />
                ))}
              </div>

              {/* Quick actions */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                style={{ marginBottom: 24 }}
              >
                <DashboardSHead label="Quick Actions" accent={T.cyan} />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                    gap: 12,
                  }}
                >
                  <DashboardQuickAction
                    icon={GitPullRequest}
                    title="View Reviews"
                    sub="See all PR analyses"
                    color={T.cyan}
                    onClick={() => navigate(ROUTES.REVIEWS)}
                  />
                  <DashboardQuickAction
                    icon={GitBranch}
                    title="Repositories"
                    sub="Manage connected repos"
                    color={T.violet}
                    onClick={() => navigate(ROUTES.REPOSITORIES)}
                  />
                  <DashboardQuickAction
                    icon={History}
                    title="View History"
                    sub="Review past scans"
                    color={T.green}
                    onClick={() => navigate(ROUTES.HISTORY)}
                  />
                  <DashboardQuickAction
                    icon={Settings}
                    title="System Settings"
                    sub="Configure guardrails"
                    color={T.amber}
                    onClick={() => navigate(ROUTES.SETTINGS)}
                  />
                </div>
              </motion.div>

              {/* Middle row — reviews + health */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
                  gap: 18,
                  marginBottom: 18,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.34 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '16px 18px',
                      borderBottom: `1px solid ${T.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <DashboardSHead label="Recent Activity" accent={T.cyan} inline />
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      onClick={() => navigate(ROUTES.REVIEWS)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 7,
                        background: 'rgba(6,182,212,0.07)',
                        border: '1px solid rgba(6,182,212,0.16)',
                        color: T.cyan,
                        cursor: 'pointer',
                        fontFamily: "'Inter',sans-serif",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      <RefreshCw size={8} />
                      View All
                    </motion.button>
                  </div>
                  <div style={{ padding: '5px 7px' }}>
                    {reviews.length > 0 ? (
                      reviews.slice(0, 5).map((r, i) => (
                        <DashboardReviewRow key={i} item={{
                          repo: r.repository.fullName,
                          pr: `#${r.prNumber}`,
                          title: r.prTitle,
                          severity: r.findings?.[0]?.severity ?? 'Low',
                          bugs: r.metrics?.vulnerabilitiesCount ?? 0,
                          time: new Date(r.createdAt).toLocaleDateString()
                        }} delay={0.3 + i * 0.05} />
                      ))
                    ) : (
                      <div style={{ color: T.muted, padding: '10px', fontSize: 12, textAlign: 'center', fontFamily: "'Inter',sans-serif" }}>No recent activity found.</div>
                    )}
                  </div>
                </motion.div>

                {/* System health */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.38 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: '16px 18px',
                  }}
                >
                  <DashboardSHead label="System Health" accent={T.green} />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <DashboardHealthRing pct={98} color={T.green} label="Security" />
                    <DashboardHealthRing pct={84} color={T.cyan} label="Quality" />
                    <DashboardHealthRing pct={91} color={T.violet} label="Coverage" />
                    <DashboardHealthRing pct={76} color={T.amber} label="Perf." />
                  </div>
                  <p
                    style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: T.muted,
                      marginBottom: 9,
                    }}
                  >
                    Issue Breakdown
                  </p>
                  {[
                    { l: 'Critical', c: T.red, p: 5, n: 2 },
                    { l: 'High', c: T.orange, p: 20, n: 8 },
                    { l: 'Medium', c: T.amber, p: 38, n: 15 },
                    { l: 'Low', c: T.green, p: 37, n: 14 },
                  ].map((b) => (
                    <div
                      key={b.l}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        marginBottom: 7,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 9,
                          color: b.c,
                          width: 38,
                          flexShrink: 0,
                        }}
                      >
                        {b.l}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: 'rgba(255,255,255,0.04)',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${b.p}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.6,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background: b.c,
                            boxShadow: `0 0 4px ${b.c}45`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 9,
                          color: T.muted,
                          width: 12,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {b.n}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Bottom row — chart + terminal */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.42 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <DashboardSHead label="PR Activity" accent={T.violet} />
                    <span
                      style={{
                        fontFamily: "'Fira Code',monospace",
                        fontSize: 9,
                        color: T.muted,
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      This Week
                    </span>
                  </div>
                  <DashboardActivityChart reviews={reviews} />
                  <div style={{ display: 'flex', marginTop: 12 }}>
                    {[
                      { l: 'Total PRs', v: reviewStats?.totalReviews ?? 0, c: T.cyan },
                      { l: 'Bugs Found', v: reviewStats?.totalVulnerabilities ?? 0, c: T.red },
                      { l: 'Auto-Fixed', v: reviewStats?.totalApplied ?? 0, c: T.green },
                    ].map((s) => (
                      <div key={s.l} style={{ flex: 1, textAlign: 'center' }}>
                        <p
                          style={{
                            fontFamily: "'Fira Code',monospace",
                            fontSize: 16,
                            fontWeight: 800,
                            color: s.c,
                            letterSpacing: '-0.5px',
                          }}
                        >
                          {s.v}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Inter',sans-serif",
                            fontSize: 8,
                            textTransform: 'uppercase',
                            letterSpacing: '0.7px',
                            color: T.muted,
                          }}
                        >
                          {s.l}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.46 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <DashboardSHead label="Live Sentinel Log" accent={T.green} />
                  </div>
                  <DashboardTerminal />
                </motion.div>
              </div>

              {/* ── Charts row — Severity Distribution + Repo Health ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                {/* Severity Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.52 }}
                >
                  <div
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <DashboardSHead label="Bug Severity Breakdown" accent={T.violet} />
                    </div>
                    {reviews.length > 0 ? (
                      <SeverityPieChart reviews={reviews} />
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '32px 0',
                          color: T.muted,
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 11,
                        }}
                      >
                        No findings yet — waiting for first PR review.
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Repo Health Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.58 }}
                >
                  <div
                    style={{
                      background: T.panel,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <DashboardSHead label="Repository Health Scores" accent={T.cyan} />
                    </div>
                    {reviews.length > 0 ? (
                      <RepoHealthChart reviews={reviews} />
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '32px 0',
                          color: T.muted,
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 11,
                        }}
                      >
                        No repository data yet — connect a repo to get started.
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UsageAnalyticsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
