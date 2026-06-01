/**
 * @file pages/ReviewDetailPage.tsx
 * @description Fully animated, high-fidelity Review Detail page for GitGuard AI.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  X,
  ChevronLeft,
  GitPullRequest,
  ShieldAlert,
  Cpu,
  Calendar,
  Code,
  FileText,
} from 'lucide-react';
import { getReview, getCommentByReview, applySuggestion } from '../services/review.service';
import type { Review } from '../types/review.types';
import { AppBackground } from '../components/layout/AppBackground';
import { T } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { SideBySideDiff } from '../components/reviews/SideBySideDiff';

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Status configuration ──────────────────────────────────────────────────────
const statusConfig = {
  completed: { bg: `${T.green}15`, text: T.green, icon: CheckCircle2, color: T.green },
  pending: { bg: `${T.amber}15`, text: T.amber, icon: Clock, color: T.amber },
  failed: { bg: `${T.red}15`, text: T.red, icon: AlertCircle, color: T.red },
} as const;

// ─── Severity configuration ────────────────────────────────────────────────────
const severityConfig = {
  critical: { bg: `${T.rose}20`, text: T.rose, border: `${T.rose}45`, label: 'CRITICAL', color: T.rose },
  high: { bg: `${T.red}15`, text: T.red, border: `${T.red}35`, label: 'HIGH', color: T.red },
  medium: { bg: `${T.amber}15`, text: T.amber, border: `${T.amber}35`, label: 'MEDIUM', color: T.amber },
  low: { bg: `${T.cyan}15`, text: T.cyan, border: `${T.cyan}35`, label: 'LOW', color: T.cyan },
  info: { bg: `${T.violet}15`, text: T.violet, border: `${T.violet}35`, label: 'INFO', color: T.violet },
} as const;

// ─── Badges ──────────────────────────────────────────────────────────────────
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
        padding: '5px 12px',
        borderRadius: 20,
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.text}35`,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Fira Code', monospace",
        letterSpacing: '0.5px',
      }}
    >
      <Icon size={13} />
      {status.toUpperCase()}
    </motion.span>
  );
};

const SeverityBadge: React.FC<{ severity: Review['findings'][number]['severity'] }> = ({ severity }) => {
  const config = severityConfig[severity] || severityConfig.info;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 6,
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "'Fira Code', monospace",
        letterSpacing: '0.5px',
      }}
    >
      {config.label}
    </span>
  );
};

// ─── GlowCard ────────────────────────────────────────────────────────────────
const GlowCard: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, color = T.cyan, delay = 0, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      style={{
        position: 'relative',
        borderRadius: 16,
        background: hov ? T.panelHov : T.panel,
        border: `1px solid ${hov ? color + '45' : T.border}`,
        transition: 'border-color 0.25s, background 0.25s',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top light bar */}
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
      {/* Glow aura */}
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

// ─── Finding Card ────────────────────────────────────────────────────────────
interface FindingCardProps {
  finding: Review['findings'][number];
  delay: number;
  commentId: string | null;
  isApplied: boolean;
  onApplySuccess: (findingId: string, commitHash: string) => void;
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  delay,
  commentId,
  isApplied,
  onApplySuccess,
}) => {
  const config = severityConfig[finding.severity] || severityConfig.info;
  const sevColor = config.color;
  const toast = useToast();
  const [applying, setApplying] = useState(false);

  const handleApplyFix = async () => {
    if (!commentId) return;
    const findingId = finding._id?.toString() || finding.id;
    if (!findingId) return;

    setApplying(true);
    try {
      const result = await applySuggestion(commentId, findingId);
      if (result.success) {
        toast.success('🔐 Suggestion Applied', 'Successfully committed fix to PR branch.');
        onApplySuccess(findingId, result.commitSha || '');
      } else {
        toast.error('❌ Apply Failed', result.message || 'Unknown error occurred.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to apply suggestion';
      toast.error('❌ Apply Failed', msg);
    } finally {
      setApplying(false);
    }
  };

  const showApplyButton = (finding.severity === 'critical' || finding.severity === 'high') && finding.suggestion && commentId;

  return (
    <GlowCard color={sevColor} delay={delay}>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 11, color: T.sub, fontWeight: 500 }}>
              {finding.file}:{finding.line}
            </span>
            <SeverityBadge severity={finding.severity} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 8, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.8px', display: 'block', fontWeight: 700 }}>
              Confidence
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.cyan, fontFamily: "'Fira Code', monospace" }}>
              {Math.round(finding.confidence * 100)}%
            </span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontWeight: 500 }}>
          {finding.message}
        </p>

        <div style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.18)',
          borderLeft: `3px solid ${sevColor}`,
          border: `1px solid ${T.border}`,
          borderLeftWidth: 3,
        }}>
          <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
            <strong style={{ color: sevColor, marginRight: 6 }}>SUGGESTION:</strong> {finding.suggestion}
          </p>
        </div>

        {showApplyButton && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            {isApplied ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'rgba(16,185,129,0.1)',
                  border: `1px solid ${T.green}40`,
                  color: T.green,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <CheckCircle2 size={13} />
                Fix Applied
              </span>
            ) : (
              <motion.button
                whileHover={applying ? {} : { scale: 1.03 }}
                whileTap={applying ? {} : { scale: 0.97 }}
                onClick={handleApplyFix}
                disabled={applying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: applying ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: applying ? 'wait' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: applying ? 'none' : `0 4px 10px ${T.cyan}25`,
                }}
              >
                {applying ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#fff',
                      }}
                    />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    Apply Fix
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </GlowCard>
  );
};

// ─── Main Page Component ─────────────────────────────────────────────────────
const ReviewDetailPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [comment, setComment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    if (!reviewId) {
      setError('Review ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getReview(reviewId)
      .then((data) => {
        setReview(data);
        getCommentByReview(reviewId)
          .then((commentData) => setComment(commentData))
          .catch((err) => {
            console.warn('Failed to fetch comment for review', err);
            setComment(null);
          });
      })
      .catch((fetchError) => {
        const message = fetchError?.response?.data?.message ?? fetchError.message ?? 'Unable to load review.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [reviewId]);

  const handleApplySuccess = (findingId: string, commitSha: string) => {
    setComment((prevComment: any) => {
      if (!prevComment) {
        return {
          _id: '',
          reviewId,
          appliedSuggestions: [{
            findingId,
            status: 'applied',
            commitHash: commitSha,
            appliedAt: new Date()
          }]
        };
      }
      const updatedSuggestions = [...(prevComment.appliedSuggestions || [])];
      const idx = updatedSuggestions.findIndex((s: any) => s.findingId === findingId);
      const newApply = {
        findingId,
        status: 'applied',
        commitHash: commitSha,
        appliedAt: new Date(),
      };
      if (idx >= 0) {
        updatedSuggestions[idx] = { ...updatedSuggestions[idx], ...newApply };
      } else {
        updatedSuggestions.push(newApply);
      }
      return {
        ...prevComment,
        appliedSuggestions: updatedSuggestions,
      };
    });
  };

  const createdAt = review ? new Date(review.createdAt) : null;
  const updatedAt = review ? new Date(review.updatedAt) : null;

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <AppBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            padding: '30px 48px',
            borderRadius: 20,
            background: T.panel,
            border: `1px solid ${T.border}`,
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: `2px solid ${T.cyan}20`,
              borderTopColor: T.cyan,
            }}
          />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '0.2px' }}>
            Retracing sentinel diagnostics...
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────
  if (error || !review) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <AppBackground />
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            maxWidth: 480,
            width: '90%',
            padding: 36,
            borderRadius: 24,
            background: T.panel,
            border: `1px solid ${T.border}`,
            backdropFilter: 'blur(12px)',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <AlertCircle size={48} color={T.red} style={{ marginBottom: 16, display: 'inline-block' }} />
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 8 }}>
            Diagnostic Scan Defunct
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 24 }}>
            {error ?? 'This review does not exist or has been deleted from GitGuard AI.'}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/history')}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              boxShadow: `0 8px 16px ${T.cyan}25`,
            }}
          >
            Back to Scan History
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 16px' }}>
      <AppBackground />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ─── Header Section ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 24,
            width: '100%',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <motion.button
                whileHover={{ scale: 1.06, x: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/history')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: 'none',
                  color: T.sub,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  padding: 0,
                  marginRight: 8,
                }}
              >
                <ChevronLeft size={16} />
                Back to History
              </motion.button>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '1px', fontFamily: "'Fira Code', monospace" }}>
                Diagnostic scan report
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <h1 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: T.text,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}>
                {review.repository.fullName}{' '}
                <span style={{ color: T.cyan, fontFamily: "'Fira Code', monospace", fontWeight: 500 }}>
                  #{review.prNumber}
                </span>
              </h1>
              <StatusBadge status={review.status} />
            </div>

            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.sub, marginTop: 6, fontWeight: 500 }}>
              {review.prTitle}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setBtnHover(true)}
            onHoverEnd={() => setBtnHover(false)}
            onClick={() => navigate('/history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: btnHover ? 'rgba(255,255,255,0.06)' : T.panel,
              border: `1px solid ${btnHover ? T.cyan + '40' : T.border}`,
              color: T.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <X size={14} />
            Close Report
          </motion.button>
        </motion.div>

        {/* ─── Metrics Cards Grid ───────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {[
            {
              icon: ShieldAlert,
              title: 'Vulnerabilities',
              val: review.metrics.vulnerabilitiesCount,
              c: review.metrics.vulnerabilitiesCount > 0 ? T.red : T.muted,
              desc: 'Security holes caught',
              delay: 0.05,
            },
            {
              icon: Cpu,
              title: 'Perf Issues',
              val: review.metrics.performanceIssuesCount,
              c: review.metrics.performanceIssuesCount > 0 ? T.amber : T.muted,
              desc: 'Complexity hotspots',
              delay: 0.1,
            },
            {
              icon: Zap,
              title: 'Quality Score',
              val: `${review.metrics.codeQualityScore}%`,
              c: review.metrics.codeQualityScore >= 80 ? T.green : review.metrics.codeQualityScore >= 50 ? T.amber : T.red,
              desc: 'Total sentinel grade',
              delay: 0.15,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <GlowCard key={idx} color={item.c} delay={item.delay}>
                <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${item.c}15`,
                    border: `1px solid ${item.c}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.c,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.8px', fontWeight: 700, display: 'block' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: T.text, display: 'block', margin: '2px 0', fontFamily: "'Fira Code', monospace" }}>
                      {item.val}
                    </span>
                    <span style={{ fontSize: 10, color: T.sub, display: 'block' }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>

        {/* ─── Main Details Section ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>

          {/* Main Area */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Overview / Summary */}
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <FileText size={18} color={T.cyan} />
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>
                  Review Summary Overview
                </h2>
              </div>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                color: T.sub,
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {review.summary || 'No review summary was generated for this scan report.'}
              </p>
            </motion.section>

            {/* Findings list */}
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${T.border}`,
                paddingBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} color={T.violet} />
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>
                    Detailed Scan Findings
                  </h2>
                </div>
                <span style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 10,
                  color: T.muted,
                  background: 'rgba(255,255,255,0.03)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  fontWeight: 600,
                }}>
                  {review.findings.length} ISSUES DETECTED
                </span>
              </div>

              {review.findings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {review.findings.map((finding, index) => {
                    const findingId = finding._id?.toString() || finding.id;
                    const isApplied = comment?.appliedSuggestions?.some(
                      (s: any) => (s.findingId === findingId || s.findingId === finding.id) && s.status === 'applied'
                    ) ?? false;

                    return (
                      <FindingCard
                        key={`${finding.file}-${finding.line}-${index}`}
                        finding={finding}
                        delay={0.3 + index * 0.05}
                        commentId={comment?._id ?? null}
                        isApplied={isApplied}
                        onApplySuccess={handleApplySuccess}
                      />
                    );
                  })}
                </div>
              ) : (
                <GlowCard color={T.green} delay={0.3}>
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <CheckCircle2 size={32} color={T.green} style={{ marginBottom: 10, display: 'inline-block' }} />
                    <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: T.text }}>
                      Sentinel Integrity Verification: Clean
                    </h3>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>
                      No issues or safety hazards were detected in this review. Codebase matches high standard sentinel rules.
                    </p>
                  </div>
                </GlowCard>
              )}
            </motion.section>

            {/* Diff Data */}
            {review.diffData ? (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Code size={18} color={T.cyan} />
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>
                    Review Diff Stream (Side-by-Side)
                  </h2>
                </div>
                <SideBySideDiff diff={review.diffData} />
              </motion.section>
            ) : null}

          </div>

          {/* Aside Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Repository details */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.8px', display: 'block', marginBottom: 8 }}>
                Repository context
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GitPullRequest size={16} color={T.cyan} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: T.text }}>
                  {review.repository.fullName}
                </span>
              </div>
              <p style={{ fontSize: 12, color: T.sub, marginTop: 8, lineHeight: 1.4 }}>
                Review for Pull Request <strong style={{ color: T.cyan }}>#{review.prNumber}</strong>. Created by automated GitHub webhook webhook triggering mechanisms.
              </p>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.28 }}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.8px', display: 'block' }}>
                TIMELINE METADATA
              </span>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.cyan,
                  flexShrink: 0,
                }}>
                  <Calendar size={14} />
                </div>
                <div>
                  <span style={{ fontSize: 8, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.5px', display: 'block', fontWeight: 700 }}>
                    SCAN INITIATED
                  </span>
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600, display: 'block', marginTop: 1 }}>
                    {createdAt?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.violet,
                  flexShrink: 0,
                }}>
                  <Clock size={14} />
                </div>
                <div>
                  <span style={{ fontSize: 8, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.5px', display: 'block', fontWeight: 700 }}>
                    COMPLETED TIMESTEP
                  </span>
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600, display: 'block', marginTop: 1 }}>
                    {updatedAt?.toLocaleString()}
                  </span>
                </div>
              </div>

            </motion.div>

            {/* Diagnostic system info */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.34 }}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: T.muted, letterSpacing: '0.8px', display: 'block' }}>
                Sentinel Diagnostics Engine
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color={T.green} />
                <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Active Version: 1.0.0 (Core)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color={T.cyan} />
                <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Engine Sandbox: Node LTS</span>
              </div>
            </motion.div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ReviewDetailPage;
