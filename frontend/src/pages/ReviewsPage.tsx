/**
 * @file pages/ReviewsPage.tsx
 * @description Fully animated, high-fidelity Reviews Center page for GitGuard AI.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  GitPullRequest,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Activity,
  Award,
} from 'lucide-react';
import { getReviews, getReviewStats, type ReviewStats } from '../services/review.service';
import type { Review } from '../types/review.types';
import { AppBackground } from '../components/layout/AppBackground';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { T } from '../constants/theme';
import Spinner from '../components/common/Spinner';
import { AnimSelect } from '../components/common/AnimSelect';

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Status configuration ──────────────────────────────────────────────────────
const statusConfig = {
  completed: { bg: `${T.green}15`, text: T.green, icon: CheckCircle2, color: T.green },
  pending: { bg: `${T.amber}15`, text: T.amber, icon: Clock, color: T.amber },
  failed: { bg: `${T.red}15`, text: T.red, icon: AlertCircle, color: T.red },
} as const;

const StatusBadge: React.FC<{ status: Review['status'] }> = ({ status }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.text}35`,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'Fira Code', monospace",
        letterSpacing: '0.3px',
      }}
    >
      <Icon size={12} />
      {status.toUpperCase()}
    </motion.span>
  );
};

// ─── Animated GlowCard Wrapper ───────────────────────────────────────────────
const GlowCard: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ children, color = T.cyan, delay = 0, onClick, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 16,
        background: hov ? T.panelHov : T.panel,
        border: `1px solid ${hov ? color + '45' : T.border}`,
        transition: 'border-color 0.25s, background 0.25s',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* top shimmer */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0.2 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
          pointerEvents: 'none',
        }}
      />
      {/* corner glow */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.div>
  );
};

// ─── Review Card ─────────────────────────────────────────────────────────────
const ReviewCard: React.FC<{
  review: Review;
  onClick: () => void;
  delay: number;
}> = ({ review, onClick, delay }) => {
  const [hov, setHov] = useState(false);
  const cardColor = statusConfig[review.status]?.color || T.cyan;

  return (
    <GlowCard color={cardColor} delay={delay} onClick={onClick}>
      <motion.div
        onHoverStart={() => setHov(true)}
        onHoverEnd={() => setHov(false)}
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 9,
                color: T.muted,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {review.repository.fullName}
            </span>
            <motion.h3
              animate={{ color: hov ? cardColor : T.text }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.2px',
              }}
            >
              {review.prTitle}
            </motion.h3>
            <span style={{ fontSize: 11, color: T.sub, display: 'block', marginTop: 4, fontFamily: "'Fira Code', monospace" }}>
              PR #{review.prNumber}
            </span>
          </div>
          <StatusBadge status={review.status} />
        </div>

        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            color: T.sub,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {review.summary || 'No review summary provided.'}
        </p>

        {/* Metrics Grid */}
        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(90px, 100%), 1fr))',
            gap: 8,
            padding: '10px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.22)',
            border: `1px solid ${T.border}`,
          }}
        >
          {[
            { v: review.metrics.vulnerabilitiesCount, l: 'Vulns', c: review.metrics.vulnerabilitiesCount > 0 ? T.red : T.muted },
            { v: review.metrics.performanceIssuesCount, l: 'Perf', c: review.metrics.performanceIssuesCount > 0 ? T.amber : T.muted },
            { v: `${review.metrics.codeQualityScore}%`, l: 'Quality', c: review.metrics.codeQualityScore >= 80 ? T.green : review.metrics.codeQualityScore >= 50 ? T.amber : T.red },
          ].map((m, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              style={{ textAlign: 'center', cursor: 'default' }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: m.c,
                }}
              >
                {m.v}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginTop: 3,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {m.l}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </GlowCard>
  );
};

type SortField = 'date' | 'vulnerabilities' | 'score';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getReviews(currentPage, 12), getReviewStats()])
      .then(([reviewsData, statsData]) => {
        setReviews(reviewsData.reviews);
        setTotalPages(reviewsData.totalPages);
        setStats(statsData);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err.message ?? 'Unable to load reviews.');
      })
      .finally(() => setLoading(false));
  }, [currentPage]);

  const filteredReviews = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return reviews
      .filter((review) => {
        if (statusFilter !== 'all' && review.status !== statusFilter) return false;
        if (!query) return true;
        return (
          review.repository.fullName.toLowerCase().includes(query) ||
          review.prTitle.toLowerCase().includes(query) ||
          review.prNumber.toString().includes(query)
        );
      })
      .sort((a, b) => {
        let aValue = new Date(a.createdAt).getTime();
        let bValue = new Date(b.createdAt).getTime();
        if (sortField === 'vulnerabilities') {
          aValue = a.metrics.vulnerabilitiesCount;
          bValue = b.metrics.vulnerabilitiesCount;
        } else if (sortField === 'score') {
          aValue = a.metrics.codeQualityScore;
          bValue = b.metrics.codeQualityScore;
        }
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
  }, [reviews, searchTerm, statusFilter, sortField, sortOrder]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        padding: '24px 28px',
      }}
    >
      <AppBackground />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {/* Breadcrumb & Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 28,
          }}
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: T.muted }}>gitguard</span>
              <span style={{ color: `${T.cyan}50` }}>/</span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: T.sub }}>reviews</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, ease: EASE }}
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: T.text,
                letterSpacing: '-0.6px',
                marginBottom: 5,
              }}
            >
              Review Center
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              style={{ fontSize: 13, color: T.sub, fontFamily: "'Inter',sans-serif" }}
            >
              Browse audit results, pull request summaries, and secure sentinel diagnostics
            </motion.p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: `0 0 28px ${T.cyan}70` }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/history')}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "'Inter',sans-serif",
                boxShadow: `0 0 18px ${T.cyan}38`,
              }}
            >
              View History
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/repositories')}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                color: T.text,
                border: `1px solid ${T.border}`,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "'Inter',sans-serif",
                transition: 'background 0.2s',
              }}
            >
              Configure Repositories
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <DashboardStatCard
            icon={Zap}
            label="Total Reviews"
            value={stats?.totalReviews || 0}
            color={T.cyan}
            delay={0.1}
          />
          <DashboardStatCard
            icon={CheckCircle2}
            label="Completed"
            value={stats?.completed || 0}
            color={T.green}
            delay={0.15}
          />
          <DashboardStatCard
            icon={Clock}
            label="Pending"
            value={stats?.pending || 0}
            color={T.amber}
            delay={0.2}
          />
        </div>

        {/* Two column dashboard body layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
          
          {/* Main List Section */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Filter controls row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.25, ease: EASE }}
              style={{
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {/* Search */}
              <div
                style={{
                  flex: 1,
                  minWidth: 220,
                  position: 'relative',
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: T.panel,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 13,
                    color: T.muted,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search reviews by repository or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    background: 'transparent',
                    border: 'none',
                    color: T.text,
                    outline: 'none',
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Select Status */}
              <AnimSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />

              {/* Sort Order Selector */}
              <AnimSelect
                value={`${sortField}-${sortOrder}`}
                onChange={(v) => {
                  const [field, order] = v.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
                options={[
                  { value: 'date-desc', label: 'Newest First' },
                  { value: 'date-asc', label: 'Oldest First' },
                  { value: 'vulnerabilities-desc', label: 'Most Vulns' },
                  { value: 'vulnerabilities-asc', label: 'Fewest Vulns' },
                  { value: 'score-desc', label: 'Top Score' },
                  { value: 'score-asc', label: 'Lowest Score' },
                ]}
              />
            </motion.div>

            {/* Grid display */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                    gap: 16,
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.04, 0.08, 0.04] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08 }}
                      style={{
                        borderRadius: 16,
                        height: 200,
                        background: 'rgba(255,255,255,0.055)',
                        border: `1px solid ${T.border}`,
                      }}
                    />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    textAlign: 'center',
                    padding: '48px 32px',
                    background: 'rgba(239,68,68,0.06)',
                    borderRadius: 16,
                    border: `1px solid ${T.red}30`,
                  }}
                >
                  <AlertCircle size={28} style={{ color: T.red, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.red, fontFamily: "'Inter',sans-serif" }}>
                    Failed to fetch reviews
                  </p>
                  <p style={{ fontSize: 13, color: T.sub, marginTop: 4, fontFamily: "'Inter',sans-serif" }}>
                    {error}
                  </p>
                </motion.div>
              ) : filteredReviews.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    textAlign: 'center',
                    padding: '72px 32px',
                    background: T.panel,
                    borderRadius: 18,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <AlertCircle size={28} style={{ color: T.muted, opacity: 0.6, margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(226,232,240,0.55)', marginBottom: 8 }}>
                    No reviews found
                  </p>
                  <p style={{ fontSize: 13, color: T.muted }}>
                    Try adjusting your filters or search keywords.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                    gap: 16,
                  }}
                >
                  <AnimatePresence>
                    {filteredReviews.map((review, i) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        onClick={() => navigate(`/history/${review.id}`)}
                        delay={0.05 + i * 0.04}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 32,
                }}
              >
                <motion.button
                  whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                  whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Previous
                </motion.button>
                <span style={{ fontSize: 13, color: T.muted, fontFamily: "'Fira Code', monospace" }}>
                  Page {currentPage} / {totalPages}
                </span>
                <motion.button
                  whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                  whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Next
                </motion.button>
              </div>
            )}
          </div>

          {/* Sidebar Section */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Insights panel */}
            <div
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.muted, marginBottom: 18 }}>
                <TrendingUp size={16} />
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Review Insights
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total Scans', value: stats?.totalReviews || 0, color: T.cyan, icon: <Activity size={14} /> },
                  { label: 'Issues Found', value: stats?.totalVulnerabilities || 0, color: T.amber, icon: <AlertCircle size={14} /> },
                  { label: 'Average Score', value: `${(stats?.totalReviews || 0) > 0 ? Math.round(stats!.averageScore) : 100}%`, color: T.green, icon: <Award size={14} /> },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 2 }}
                    style={{
                      background: 'rgba(0,0,0,0.22)',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted, marginBottom: 6 }}>
                      {item.icon}
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 20, fontWeight: 800, color: item.color }}>
                      {item.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick help info panel */}
            <div
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: '20px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.muted, marginBottom: 10 }}>
                <Zap size={15} style={{ color: T.cyan }} />
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>Dynamic Monitoring</span>
              </div>
              <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
                GitGuard monitors your connected webhooks automatically. If new issues are found, the results will appear instantly in your live reviews queue.
              </p>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default ReviewsPage;
