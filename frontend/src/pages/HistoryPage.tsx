/**
 * @file pages/HistoryPage.tsx
 * @description Fully animated, glassmorphism Review History page for GitGuard AI.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Clock, AlertCircle, CheckCircle2, Zap, Calendar, Award, Shield } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import type { Review } from '../types/review.types';
import Spinner from '../components/common/Spinner';
import { AppBackground } from '../components/layout/AppBackground';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { T } from '../constants/theme';
import { AnimSelect } from '../components/common/AnimSelect';
import ExportButton from '../components/history/ExportButton';
import { ExportPdfButton } from '../components/history/ExportPdfButton';

const EASE = [0.22, 1, 0.36, 1] as const;

const statusConfig = {
  completed: { bg: `${T.green}15`, text: T.green, icon: CheckCircle2, color: T.green },
  pending: { bg: `${T.amber}15`, text: T.amber, icon: Clock, color: T.amber },
  failed: { bg: `${T.red}15`, text: T.red, icon: AlertCircle, color: T.red },
} as const;

// ─── Status Badge Component ────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: 'pending' | 'completed' | 'failed' }> = ({ status }) => {
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

// ─── GlowCard Wrapper ────────────────────────────────────────────────────────
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

// ─── Review Card Component ────────────────────────────────────────────────────
const ReviewCard: React.FC<{ review: Review; onClick: () => void; delay: number }> = ({ review, onClick, delay }) => {
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
            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: cardColor,
                  letterSpacing: '0.5px',
                }}
              >
                {review.repository.fullName}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.2px' }}>
                {review.prTitle}
              </h3>
              <span style={{ fontSize: 11, color: T.sub, display: 'block', marginTop: 2, fontFamily: "'Fira Code', monospace" }}>
                PR #{review.prNumber}
              </span>
            </div>
            <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 14 }}>
              {review.summary || 'No review summary provided.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, fontWeight: 600 }}>
              {review.metrics.vulnerabilitiesCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.red }}>
                  <AlertCircle size={13} />
                  <span>{review.metrics.vulnerabilitiesCount} vulnerabilities</span>
                </div>
              )}
              {review.metrics.performanceIssuesCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.amber }}>
                  <Zap size={13} />
                  <span>{review.metrics.performanceIssuesCount} performance</span>
                </div>
              )}
              {review.metrics.codeQualityScore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.green }}>
                  <Award size={13} />
                  <span>Score: <span style={{ fontWeight: 800 }}>{review.metrics.codeQualityScore}%</span></span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <StatusBadge status={review.status} />
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'Fira Code', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} />
              {new Date(review.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </motion.div>
    </GlowCard>
  );
};

// ─── Main History Page ────────────────────────────────────────────────────────
const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const { reviews, totalItems, isLoading, filters, setFilters } = useReviews({ status: 'all' });
  const navigate = useNavigate();

  const filtered = reviews.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.repository.fullName.toLowerCase().includes(term) ||
      r.prTitle.toLowerCase().includes(term) ||
      r.prNumber.toString().includes(term)
    );
  });

  const stats = {
    total: totalItems,
    completed: reviews.filter((r) => r.status === 'completed').length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    failed: reviews.filter((r) => r.status === 'failed').length,
  };

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
          style={{ marginBottom: 28 }}
        >
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
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: T.sub }}>history</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, ease: EASE }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: T.text,
              letterSpacing: '-0.6px',
              marginBottom: 5,
            }}
          >
            Review History
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            style={{ fontSize: 13, color: T.sub }}
          >
            Explore and audit full archives of all past pull request review operations
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <DashboardStatCard icon={Shield} label="Total Reviews" value={stats.total} color={T.cyan} delay={0.1} />
          <DashboardStatCard icon={CheckCircle2} label="Completed" value={stats.completed} color={T.green} delay={0.15} />
          <DashboardStatCard icon={Clock} label="Pending" value={stats.pending} color={T.amber} delay={0.2} />
          <DashboardStatCard icon={AlertCircle} label="Failed" value={stats.failed} color={T.red} delay={0.25} />
        </div>

        {/* Controls Panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.3, ease: EASE }}
          style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.panel,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={15} style={{ position: 'absolute', left: 13, color: T.muted }} />
              <input
                type="text"
                placeholder="Search history by repository name, pull request title, or commit hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  background: 'transparent',
                  border: 'none',
                  color: T.text,
                  outline: 'none',
                  fontSize: 13,
                  fontFamily: "'Inter',sans-serif",
                }}
              />
            </div>
            <ExportButton reviews={filtered} />
            <ExportPdfButton reviews={filtered} />
            <motion.button
              whileHover={{ scale: 1.05, borderColor: `${T.cyan}40` }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '11px 20px',
                borderRadius: 12,
                background: showFilters ? 'rgba(255,255,255,0.08)' : T.panel,
                color: T.text,
                border: `1px solid ${T.border}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Filter size={15} />
              <span>Filters</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: EASE }}
                style={{ overflow: 'visible', zIndex: 100 }}
              >
                <div
                  style={{
                    background: 'rgba(0,0,0,0.22)',
                    padding: '16px 20px',
                    borderRadius: 14,
                    border: `1px solid ${T.border}`,
                    position: 'relative',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Inter', sans-serif" }}>
                    Filter By Status
                  </label>
                  <AnimSelect
                    value={filters.status || 'all'}
                    onChange={(v) => setFilters({ ...filters, status: v as any })}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'failed', label: 'Failed' },
                    ]}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.04, 0.08, 0.04] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08 }}
                  style={{
                    borderRadius: 16,
                    height: 120,
                    background: 'rgba(255,255,255,0.055)',
                    border: `1px solid ${T.border}`,
                  }}
                />
              ))}
            </motion.div>
          ) : filtered.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, fontFamily: "'Inter', sans-serif" }}>
                Found {filtered.length} review records
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map((review, i) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onClick={() => navigate(`/history/${review.id}`)}
                    delay={0.05 + i * 0.03}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: T.panel,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
              }}
            >
              <AlertCircle size={32} style={{ color: T.muted, marginBottom: 12, opacity: 0.6, margin: '0 auto' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.55)', marginBottom: 6 }}>
                No review archives match
              </p>
              <p style={{ fontSize: 13, color: T.muted }}>
                Adjust your search text or clear filters to locate records.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default HistoryPage;
