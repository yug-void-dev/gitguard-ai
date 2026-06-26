/**
 * @file pages/RepositoriesPage.tsx
 * @description Fully animated Repositories management page for GitGuard AI.
 * Drop-in replacement — same props, hooks, and types as before.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  Plus,
  Search,
  Settings,
  ToggleRight,
  Trash2,
  Code2,
  Shield,
  AlertCircle,
  BookOpen,
  Activity,
  PauseCircle,
  GitBranch,
  ExternalLink,
  Star,
  Zap,
  Lock,
  Unlock,
  ChevronDown,
  Filter,
  ArrowUpDown,
  X,
  CheckCircle2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useRepository } from '../hooks/useRepository';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../constants/config';
import type { ConnectedRepo, Repository, RepositoryRule } from '../types/repository.types';
import Spinner from '../components/common/Spinner';
import { AppBackground } from '../components/layout/AppBackground';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { DashboardSHead } from '../components/dashboard/DashboardQuickActions';
import { T } from '../constants/theme';

type SortField = 'name' | 'language' | 'recent';
type SortOrder = 'asc' | 'desc';

// ─── Shared easing ────────────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Animated gradient border card wrapper ────────────────────────────────────
const GlowCard: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, color = T.cyan, delay = 0, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
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

// ─── Security Mode Badge ──────────────────────────────────────────────────────
const SecurityModeBadge: React.FC<{ strictMode: boolean }> = ({
  strictMode,
}) => {
  const cfg = strictMode
    ? { c: T.amber, label: 'Strict', icon: <Lock size={10} /> }
    : { c: T.cyan, label: 'Standard', icon: <Unlock size={10} /> };
  return (
    <motion.span
      whileHover={{ scale: 1.06 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        background: `${cfg.c}15`,
        color: cfg.c,
        border: `1px solid ${cfg.c}35`,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'Fira Code', monospace",
        letterSpacing: '0.4px',
        cursor: 'default',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </motion.span>
  );
};

// ─── Language Badge ───────────────────────────────────────────────────────────
const LANG_COLOR: Record<string, string> = {
  TypeScript: T.cyan,
  JavaScript: T.amber,
  Python: T.green,
  Go: '#00acd7',
  Java: T.orange,
  Rust: T.red,
  Ruby: T.violet,
  PHP: '#a855f7',
};
const LanguageBadge: React.FC<{ language?: string | null }> = ({
  language,
}) => {
  if (!language)
    return (
      <span
        style={{
          fontSize: 10,
          color: T.muted,
          fontFamily: "'Fira Code',monospace",
        }}
      >
        Unknown
      </span>
    );
  const c = LANG_COLOR[language] ?? T.muted;
  return (
    <motion.span
      whileHover={{ scale: 1.06 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        background: `${c}15`,
        color: c,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'Fira Code', monospace",
        letterSpacing: '0.4px',
        cursor: 'default',
      }}
    >
      <Code2 size={10} />
      {language}
    </motion.span>
  );
};

// ─── Status pulse dot ─────────────────────────────────────────────────────────
const PulseDot: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
    {active && (
      <motion.div
        animate={{ scale: [1, 2], opacity: [0.6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: T.green,
        }}
      />
    )}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: active ? T.green : T.muted,
        boxShadow: active ? `0 0 6px ${T.green}` : 'none',
      }}
    />
  </div>
);

// ─── Animated progress bar ────────────────────────────────────────────────────
const ProgressBar: React.FC<{
  value: number;
  color: string;
  delay?: number;
}> = ({ value, color, delay = 0 }) => (
  <div
    style={{
      height: 3,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}
  >
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, value)}%` }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      style={{
        height: '100%',
        borderRadius: 2,
        background: color,
        boxShadow: `0 0 6px ${color}60`,
      }}
    />
  </div>
);

// ─── Repository Card ──────────────────────────────────────────────────────────
interface RepoCardProps {
  repo: ConnectedRepo;
  onConfigure: (r: ConnectedRepo) => void;
  onToggle: (r: ConnectedRepo) => void;
  onDelete: (r: ConnectedRepo) => void;
  delay?: number;
  index: number;
}

const RepositoryCard: React.FC<RepoCardProps> = ({
  repo,
  onConfigure,
  onToggle,
  onDelete,
  delay = 0,
  index,
}) => {
  const [hov, setHov] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const cardColor = repo.isActive ? T.cyan : T.muted;
  const confidence = Math.round(repo.rules.minConfidence * 100);

  return (
    <GlowCard color={cardColor} delay={delay}>
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
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            {/* Index number */}
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: 9,
                color: T.muted,
                marginBottom: 4,
                letterSpacing: '1px',
              }}
            >
              #{String(index + 1).padStart(2, '0')}
            </div>
            <motion.h3
              animate={{ color: hov ? cardColor : T.text }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.2px',
              }}
            >
              {repo.repositoryFullName}
            </motion.h3>
          </div>

          {/* Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <PulseDot active={repo.isActive} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'Inter',sans-serif",
                color: repo.isActive ? T.green : T.muted,
                letterSpacing: '0.3px',
              }}
            >
              {repo.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* ── Badges ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 14,
          }}
        >
          <SecurityModeBadge strictMode={repo.rules.strictMode} />
          <LanguageBadge language={repo.meta?.language} />
          {repo.meta?.stargazersCount != null &&
            repo.meta.stargazersCount > 0 && (
              <motion.span
                whileHover={{ scale: 1.06 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 20,
                  background: 'rgba(245,158,11,0.1)',
                  color: T.amber,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'Fira Code',monospace",
                }}
              >
                <Star size={9} />
                {repo.meta.stargazersCount}
              </motion.span>
            )}
        </div>

        {/* ── Stats grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))',
            gap: 8,
            padding: '12px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.22)',
            border: `1px solid ${T.border}`,
            marginBottom: 14,
          }}
        >
          {[
            {
              label: 'Webhook',
              val: repo.webhookId ? 'Connected' : 'Pending Setup',
              color: repo.webhookId ? T.green : T.amber,
              icon: repo.webhookId ? (
                <CheckCircle2 size={11} />
              ) : (
                <AlertCircle size={11} />
              ),
            },
            {
              label: 'Linting',
              val: repo.rules.ignoreLinting ? 'Ignored' : 'Enabled',
              color: repo.rules.ignoreLinting ? T.amber : T.cyan,
              icon: <Zap size={11} />,
            },
            {
              label: 'Performance',
              val: repo.rules.checkPerformance ? 'On' : 'Off',
              color: repo.rules.checkPerformance ? T.violet : T.muted,
              icon: <Activity size={11} />,
            },
            {
              label: 'Confidence',
              val: `${confidence}%`,
              color:
                confidence >= 80 ? T.green : confidence >= 50 ? T.amber : T.red,
              icon: <Shield size={11} />,
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ scale: 1.03 }}
              style={{ cursor: 'default' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 3,
                }}
              >
                <span style={{ color: T.muted, display: 'flex' }}>
                  {item.icon}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: T.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: item.color,
                  fontFamily: "'Fira Code',monospace",
                }}
              >
                {item.val}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Confidence progress */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: T.muted,
                fontFamily: "'Inter',sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              Min Confidence
            </span>
            <span
              style={{
                fontSize: 9,
                color: T.cyan,
                fontFamily: "'Fira Code',monospace",
                fontWeight: 700,
              }}
            >
              {confidence}%
            </span>
          </div>
          <ProgressBar
            value={confidence}
            color={
              confidence >= 80 ? T.green : confidence >= 50 ? T.amber : T.red
            }
            delay={delay + 0.3}
          />
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
          {/* Configure */}
          <motion.button
            whileHover={{ scale: 1.04, background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onConfigure(repo)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 9,
              background: 'rgba(255,255,255,0.05)',
              color: T.text,
              border: `1px solid ${T.border}`,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Inter',sans-serif",
              transition: 'background 0.18s',
            }}
          >
            <Settings size={13} />
            Configure
          </motion.button>

          {/* Toggle */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onToggle(repo)}
            title={repo.isActive ? 'Pause monitoring' : 'Resume monitoring'}
            style={{
              padding: '8px 11px',
              borderRadius: 9,
              background: repo.isActive ? `${T.green}18` : `${T.muted}18`,
              color: repo.isActive ? T.green : T.muted,
              border: `1px solid ${repo.isActive ? T.green + '30' : T.muted + '25'}`,
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            <ToggleRight size={14} />
          </motion.button>

          {/* Delete */}
          <AnimatePresence mode="wait">
            {deleteConfirm ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                style={{ display: 'flex', gap: 5 }}
              >
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    onDelete(repo);
                    setDeleteConfirm(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    background: `${T.red}25`,
                    color: T.red,
                    border: `1px solid ${T.red}40`,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
                  Yes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setDeleteConfirm(false)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    background: 'rgba(255,255,255,0.05)',
                    color: T.muted,
                    border: `1px solid ${T.border}`,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
                  No
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="del"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setDeleteConfirm(true)}
                title="Delete repository"
                style={{
                  padding: '8px 11px',
                  borderRadius: 9,
                  background: `${T.red}12`,
                  color: T.red,
                  border: `1px solid ${T.red}25`,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
              >
                <Trash2 size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* External link */}
        {repo.meta?.htmlUrl && (
          <motion.a
            href={repo.meta.htmlUrl}
            target="_blank"
            rel="noreferrer"
            whileHover={{ color: T.cyan }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 10,
              color: T.muted,
              textDecoration: 'none',
              fontSize: 10,
              fontFamily: "'Fira Code',monospace",
              transition: 'color 0.18s',
            }}
          >
            <ExternalLink size={9} /> View on GitHub
          </motion.a>
        )}
      </motion.div>
    </GlowCard>
  );
};

// ─── Animated toggle rule row ─────────────────────────────────────────────────
const RuleToggle: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, desc, checked, onChange }) => (
  <motion.label
    whileHover={{ x: 2 }}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      cursor: 'pointer',
    }}
  >
    {/* Custom toggle */}
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        flexShrink: 0,
        marginTop: 2,
        background: checked ? T.cyan : 'rgba(255,255,255,0.1)',
        border: `1px solid ${checked ? T.cyan + '60' : T.border}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.25s, border-color 0.25s',
        boxShadow: checked ? `0 0 8px ${T.cyan}50` : 'none',
      }}
    >
      <motion.div
        animate={{ x: checked ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: checked ? '#fff' : T.muted,
        }}
      />
    </div>
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.text,
          fontFamily: "'Inter',sans-serif",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: T.muted,
          fontFamily: "'Inter',sans-serif",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  </motion.label>
);

// ─── Settings Modal ───────────────────────────────────────────────────────────
interface SettingsProps {
  repo: ConnectedRepo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, rules: Partial<RepositoryRule>) => Promise<void>;
}

const RepositorySettings: React.FC<SettingsProps> = ({
  repo,
  isOpen,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const [strictMode, setStrictMode] = useState(repo.rules.strictMode);
  const [ignoreLinting, setIgnoreLinting] = useState(repo.rules.ignoreLinting);
  const [checkPerf, setCheckPerf] = useState(repo.rules.checkPerformance);
  const [confidence, setConfidence] = useState(repo.rules.minConfidence);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(repo._id, {
        strictMode,
        ignoreLinting,
        checkPerformance: checkPerf,
        minConfidence: confidence,
      });
      toast.success('Repository rules updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update repository rules');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 20,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${T.cyan}10`,
          }}
        >
          {/* Top shimmer */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(90deg,transparent,${T.cyan}60,transparent)`,
            }}
          />

          {/* Header */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'rgba(6,10,20,0.94)',
              backdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${T.border}`,
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${T.cyan}40`,
                }}
              >
                <Settings size={15} color="#fff" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 14,
                    fontWeight: 800,
                    color: T.text,
                  }}
                >
                  Repository Settings
                </div>
                <div
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: 10,
                    color: T.muted,
                  }}
                >
                  {repo.repositoryFullName}
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.12, color: T.red }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: '5px 7px',
                cursor: 'pointer',
                color: T.muted,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.18s',
              }}
            >
              <X size={15} />
            </motion.button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Repo info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{ marginBottom: 24 }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  marginBottom: 10,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                Repository Info
              </div>
              <div
                style={{
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.muted,
                      marginBottom: 3,
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Full Name
                  </div>
                  <div
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: 13,
                      color: T.cyan,
                    }}
                  >
                    {repo.repositoryFullName}
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100px, 100%), 1fr))',
                    gap: 12,
                  }}
                >
                  {[
                    { l: 'Language', v: repo.meta?.language || 'Unknown' },
                    { l: 'Stars', v: String(repo.meta?.stargazersCount ?? 0) },
                    {
                      l: 'Webhook',
                      v: repo.webhookId ? 'Connected' : 'Pending Setup',
                    },
                  ].map((item) => (
                    <div key={item.l}>
                      <div
                        style={{
                          fontSize: 9,
                          color: T.muted,
                          marginBottom: 3,
                          fontFamily: "'Inter',sans-serif",
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                        }}
                      >
                        {item.l}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.text,
                          fontFamily: "'Fira Code',monospace",
                          fontWeight: 600,
                        }}
                      >
                        {item.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Rules */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ marginBottom: 24 }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  marginBottom: 16,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                Analysis Rules
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <RuleToggle
                  label="Strict Mode"
                  desc="Enable strict security scanning. Fails PRs on any high-severity finding."
                  checked={strictMode}
                  onChange={setStrictMode}
                />
                <RuleToggle
                  label="Ignore Linting"
                  desc="Skip stylistic and linter issues. Focus solely on code quality."
                  checked={ignoreLinting}
                  onChange={setIgnoreLinting}
                />
                <RuleToggle
                  label="Check Performance"
                  desc="Analyze code for performance anti-patterns and O(n²) loops."
                  checked={checkPerf}
                  onChange={setCheckPerf}
                />

                {/* Confidence slider */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: "'Inter',sans-serif",
                      }}
                    >
                      Minimum Confidence
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: T.cyan,
                        fontFamily: "'Fira Code',monospace",
                        background: `${T.cyan}14`,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {confidence.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ position: 'relative', paddingBottom: 4 }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={confidence}
                      onChange={(e) =>
                        setConfidence(parseFloat(e.target.value))
                      }
                      style={{
                        width: '100%',
                        accentColor: T.cyan,
                        cursor: 'pointer',
                        height: 4,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      {['0.0', '0.25', '0.5', '0.75', '1.0'].map((v) => (
                        <span
                          key={v}
                          style={{
                            fontSize: 9,
                            color: T.muted,
                            fontFamily: "'Fira Code',monospace",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.muted,
                      marginTop: 6,
                      fontFamily: "'Inter',sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    Only report findings with a confidence score above this
                    threshold.
                  </div>
                  {/* Live progress bar */}
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar
                      value={confidence * 100}
                      color={
                        confidence >= 0.8
                          ? T.green
                          : confidence >= 0.5
                            ? T.amber
                            : T.red
                      }
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* CI/CD Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{ marginBottom: 24 }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  marginBottom: 16,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                CI/CD Status Badge
              </div>
              <div
                style={{
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 12, color: T.text, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Live Badge Preview</span>
                  <img
                    src={`${API_BASE_URL}/comments/badge/${repo._id}?redirect=true`}
                    alt="GitGuard AI Grade"
                    style={{ height: 20, borderRadius: 3 }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://img.shields.io/badge/GitGuard_AI-no_reviews-lightgrey?style=flat-square';
                    }}
                  />
                </div>
                
                <div>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, fontFamily: "'Inter',sans-serif" }}>
                    Copy Markdown for README.md:
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '10px 36px 10px 12px',
                      fontFamily: "'Fira Code', monospace",
                      fontSize: 11,
                      color: T.sub,
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4,
                    }}
                  >
                    {`[![GitGuard AI](${API_BASE_URL}/comments/badge/${repo._id}?redirect=true)](https://github.com/${repo.repositoryFullName})`}
                    <motion.button
                      whileHover={{ scale: 1.1, color: T.cyan }}
                      whileTap={{ scale: 0.9 }}
                      onClick={async () => {
                        const markdown = `[![GitGuard AI](${API_BASE_URL}/comments/badge/${repo._id}?redirect=true)](https://github.com/${repo.repositoryFullName})`;
                        try {
                          await navigator.clipboard.writeText(markdown);
                          toast.success('📋 Markdown Copied', 'Markdown badge code copied to clipboard');
                        } catch (err) {
                          toast.error('❌ Copy Failed', 'Please copy it manually');
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: T.muted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                      title="Copy to clipboard"
                    >
                      <Copy size={13} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Modal actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{
                display: 'flex',
                gap: 10,
                paddingTop: 20,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  color: T.sub,
                  border: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13,
                  transition: 'background 0.18s',
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${T.cyan}50` }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 10,
                  background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
                  color: '#fff',
                  border: 'none',
                  cursor: saving ? 'wait' : 'pointer',
                  fontWeight: 700,
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: `0 0 12px ${T.cyan}35`,
                  opacity: saving ? 0.8 : 1,
                  transition: 'opacity 0.18s',
                }}
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Save Changes
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Add Repository Modal ──────────────────────────────────────────────────────
interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubRepos: Repository[];
  connectedRepos: ConnectedRepo[];
  isConnecting: boolean;
  onConnect: (fullName: string, id: number) => Promise<void>;
}

const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  githubRepos,
  connectedRepos,
  isConnecting,
  onConnect,
}) => {
  const [search, setSearch] = useState('');
  const [connectingId, setConnectingId] = useState<number | null>(null);

  // Filter available GitHub repos based on search term
  const filtered = useMemo(() => {
    return githubRepos.filter((repo) =>
      repo.fullName.toLowerCase().includes(search.toLowerCase())
    );
  }, [githubRepos, search]);

  const handleConnect = async (fullName: string, id: number) => {
    setConnectingId(id);
    try {
      await onConnect(fullName, id);
    } catch (err) {
      // handled by hook
    } finally {
      setConnectingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="add-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 20,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          key="add-modal"
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            width: '100%',
            maxWidth: 600,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${T.cyan}10`,
          }}
        >
          {/* Top shimmer */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(90deg,transparent,${T.cyan}60,transparent)`,
            }}
          />

          {/* Header */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(6,10,20,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${T.cyan}40`,
                }}
              >
                <Plus size={15} color="#fff" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 15,
                    fontWeight: 800,
                    color: T.text,
                  }}
                >
                  Connect GitHub Repository
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  Select from your available GitHub repositories to integrate with GitGuard AI
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.12, color: T.red }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: '5px 7px',
                cursor: 'pointer',
                color: T.muted,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </motion.button>
          </div>

          {/* Search Input */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: 'rgba(6,10,20,0.2)' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: T.muted,
                }}
              />
              <input
                type="text"
                placeholder="Search your GitHub repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  outline: 'none',
                  fontSize: 13,
                  fontFamily: "'Inter',sans-serif",
                }}
              />
            </div>
          </div>

          {/* Repo List */}
          <div
            style={{
              padding: '16px 24px',
              overflowY: 'auto',
              flex: 1,
              background: 'rgba(4,6,12,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {githubRepos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block', marginBottom: 12 }}
                >
                  <RefreshCw size={24} style={{ color: T.cyan }} />
                </motion.div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Loading repositories from GitHub...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
                <AlertCircle size={24} style={{ margin: '0 auto 8px', color: T.muted }} />
                <div style={{ fontSize: 13 }}>No repositories match your search.</div>
              </div>
            ) : (
              filtered.map((repo) => {
                const isAlreadyConnected = connectedRepos.some(
                  (cr) => cr.repositoryId === repo.id
                );
                const isConnectingThis = connectingId === repo.id;

                return (
                  <motion.div
                    key={repo.id}
                    whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.015)',
                      border: `1px solid ${T.border}`,
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0, marginRight: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "'Fira Code', monospace",
                            fontSize: 13,
                            color: T.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {repo.fullName}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 10,
                            background: repo.isPrivate ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                            color: repo.isPrivate ? T.red : T.green,
                            border: `1px solid ${repo.isPrivate ? T.red + '30' : T.green + '30'}`,
                            fontWeight: 700,
                          }}
                        >
                          {repo.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: T.muted }}>
                        {repo.language && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Code2 size={11} /> {repo.language}
                          </span>
                        )}
                        {repo.stargazersCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: T.amber }}>
                            <Star size={11} /> {repo.stargazersCount}
                          </span>
                        )}
                        <span>Updated: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      {isAlreadyConnected ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.green,
                            background: `${T.green}15`,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: `1px solid ${T.green}30`,
                            cursor: 'default',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Connected
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.04, boxShadow: `0 0 12px ${T.cyan}40` }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleConnect(repo.fullName, repo.id)}
                          disabled={isConnecting}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`,
                            color: '#fff',
                            border: 'none',
                            cursor: isConnecting ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: 12,
                            fontFamily: "'Inter', sans-serif",
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: isConnecting ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {isConnectingThis ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            >
                              <RefreshCw size={12} />
                            </motion.div>
                          ) : (
                            <Plus size={12} />
                          )}
                          Connect
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(6,10,20,0.4)',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                color: T.muted,
                border: `1px solid ${T.border}`,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Custom Select ────────────────────────────────────────────────────────────
const AnimSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}> = ({ value, onChange, options, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ borderColor: `${T.cyan}40` }}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 12,
          cursor: 'pointer',
          background: T.panel,
          border: `1px solid ${open ? T.cyan + '45' : T.border}`,
          color: T.sub,
          fontFamily: "'Inter',sans-serif",
          fontSize: 13,
          whiteSpace: 'nowrap',
          transition: 'border-color 0.18s',
        }}
      >
        {icon && (
          <span style={{ color: T.muted, display: 'flex' }}>{icon}</span>
        )}
        {current}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: '100%',
              zIndex: 100,
              background: 'rgba(8,12,24,0.97)',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 20px ${T.cyan}08`,
              backdropFilter: 'blur(16px)',
            }}
          >
            {options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  background:
                    value === opt.value ? `${T.cyan}12` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: value === opt.value ? T.cyan : T.sub,
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderLeft:
                    value === opt.value
                      ? `2px solid ${T.cyan}`
                      : '2px solid transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
                whileHover={{
                  background: 'rgba(255,255,255,0.05)',
                  color: T.text,
                }}
              >
                {value === opt.value && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 size={11} />
                  </motion.div>
                )}
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ filtered: boolean }> = ({ filtered }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: EASE }}
    style={{
      textAlign: 'center',
      padding: '72px 32px',
      background: T.panel,
      borderRadius: 18,
      border: `1px solid ${T.border}`,
    }}
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        background: `${T.cyan}10`,
        border: `1px solid ${T.cyan}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        color: `${T.cyan}70`,
      }}
    >
      <AlertCircle size={28} />
    </motion.div>
    <p
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: 'rgba(226,232,240,0.55)',
        marginBottom: 8,
        fontFamily: "'Inter',sans-serif",
      }}
    >
      {filtered ? 'No repositories match' : 'No repositories connected'}
    </p>
    <p
      style={{ fontSize: 13, color: T.muted, fontFamily: "'Inter',sans-serif" }}
    >
      {filtered
        ? 'Try adjusting your search or filters.'
        : 'Click "Add Repository" to get started.'}
    </p>
  </motion.div>
);

// ─── Page header with animated breadcrumb ─────────────────────────────────────
const PageHeader: React.FC<{ total: number; onAdd: () => void }> = ({
  total,
  onAdd,
}) => (
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
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.muted,
          }}
        >
          gitguard
        </span>
        <span style={{ color: `${T.cyan}50` }}>/</span>
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: 10,
            color: T.sub,
          }}
        >
          repositories
        </span>
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
        Repositories
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        style={{ fontSize: 13, color: T.sub, fontFamily: "'Inter',sans-serif" }}
      >
        Manage and configure your connected GitHub repositories
        {total > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              background: `${T.cyan}18`,
              color: T.cyan,
              padding: '2px 8px',
              borderRadius: 20,
              fontFamily: "'Fira Code',monospace",
              border: `1px solid ${T.cyan}30`,
            }}
          >
            {total} connected
          </motion.span>
        )}
      </motion.p>
    </div>

    <motion.button
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, ease: EASE }}
      whileHover={{ scale: 1.05, boxShadow: `0 0 28px ${T.cyan}70` }}
      whileTap={{ scale: 0.95 }}
      onClick={onAdd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
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
        letterSpacing: '0.1px',
      }}
    >
      <Plus size={16} />
      Add Repository
    </motion.button>
  </motion.div>
);

// ─── Search + filters bar ─────────────────────────────────────────────────────
const FiltersBar: React.FC<{
  search: string;
  setSearch: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  sort: SortField;
  setSort: (v: SortField) => void;
  order: SortOrder;
  setOrder: (v: SortOrder) => void;
  count: number;
  total: number;
}> = ({
  search,
  setSearch,
  filter,
  setFilter,
  sort,
  setSort,
  order,
  setOrder,
  count,
  total,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.32, ease: EASE }}
      style={{ marginBottom: 22 }}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <motion.div
          animate={{
            borderColor: focused ? `${T.cyan}50` : T.border,
            boxShadow: focused ? `0 0 0 3px ${T.cyan}12` : 'none',
          }}
          transition={{ duration: 0.2 }}
          style={{
            flex: 1,
            minWidth: 220,
            position: 'relative',
            borderRadius: 12,
            border: `1px solid`,
            overflow: 'hidden',
            background: T.panel,
            borderColor: T.border,
          }}
        >
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: focused ? T.cyan : T.muted,
              transition: 'color 0.18s',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: T.muted,
                }}
              >
                <X size={10} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Custom selects */}
        <AnimSelect
          value={filter}
          onChange={setFilter}
          icon={<Filter size={13} />}
          options={[
            { value: 'all', label: 'All Repos' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' },
          ]}
        />
        <AnimSelect
          value={sort}
          onChange={(v) => setSort(v as SortField)}
          icon={<ArrowUpDown size={13} />}
          options={[
            { value: 'name', label: 'By Name' },
            { value: 'language', label: 'By Language' },
            { value: 'recent', label: 'By Recent' },
          ]}
        />
        <motion.button
          whileHover={{
            scale: 1.06,
            borderColor: `${T.violet}50`,
            color: T.violet,
          }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          title={
            order === 'asc' ? 'Switch to descending' : 'Switch to ascending'
          }
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            cursor: 'pointer',
            background: T.panel,
            border: `1px solid ${T.border}`,
            color: T.sub,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: "'Inter',sans-serif",
            fontSize: 13,
            transition: 'color 0.18s, border-color 0.18s',
          }}
        >
          <motion.div
            animate={{ rotate: order === 'asc' ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown size={14} />
          </motion.div>
          {order === 'asc' ? 'A→Z' : 'Z→A'}
        </motion.button>
      </div>

      {/* Result count */}
      <AnimatePresence>
        {(search || filter !== 'all') && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: T.muted,
                fontFamily: "'Inter',sans-serif",
              }}
            >
              Showing{' '}
              <span
                style={{
                  color: T.cyan,
                  fontWeight: 700,
                  fontFamily: "'Fira Code',monospace",
                }}
              >
                {count}
              </span>{' '}
              of{' '}
              <span
                style={{
                  color: T.sub,
                  fontWeight: 700,
                  fontFamily: "'Fira Code',monospace",
                }}
              >
                {total}
              </span>{' '}
              repositories
            </span>
            <motion.button
              whileHover={{ color: T.cyan }}
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: T.muted,
                fontSize: 11,
                fontFamily: "'Inter',sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <X size={10} />
              Clear filters
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Grid skeleton loader ─────────────────────────────────────────────────────
const SkeletonCard: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0.04, 0.08, 0.04] }}
    transition={{ duration: 1.8, repeat: Infinity, delay }}
    style={{
      borderRadius: 16,
      height: 280,
      background: 'rgba(255,255,255,0.055)',
      border: `1px solid ${T.border}`,
    }}
  />
);

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const RepositoriesPage: React.FC = () => {
  const {
    connectedRepos,
    githubRepos,
    isLoading,
    isConnecting,
    loadGitHubRepos,
    connectRepo,
    updateRules,
    toggleActive,
    disconnectRepo,
  } = useRepository();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedRepo, setSelectedRepo] = useState<ConnectedRepo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Filter + sort
  const filtered = useMemo(() => {
    let r = connectedRepos;
    if (filterActive === 'active') r = r.filter((x) => x.isActive);
    if (filterActive === 'inactive') r = r.filter((x) => !x.isActive);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      r = r.filter(
        (x) =>
          x.repositoryFullName.toLowerCase().includes(t) ||
          (x.meta?.language?.toLowerCase() ?? '').includes(t)
      );
    }
    return [...r].sort((a, b) => {
      let av: string | number = a.repositoryFullName.toLowerCase();
      let bv: string | number = b.repositoryFullName.toLowerCase();
      if (sortField === 'language') {
        av = (a.meta?.language ?? '').toLowerCase();
        bv = (b.meta?.language ?? '').toLowerCase();
      }
      if (sortField === 'recent') {
        av = new Date(a.updatedAt).getTime();
        bv = new Date(b.updatedAt).getTime();
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [connectedRepos, searchTerm, filterActive, sortField, sortOrder]);

  const stats = {
    total: connectedRepos.length,
    active: connectedRepos.filter((r) => r.isActive).length,
    inactive: connectedRepos.filter((r) => !r.isActive).length,
    langs: new Set(connectedRepos.map((r) => r.meta?.language).filter(Boolean))
      .size,
  };

  const handleConfigure = (r: ConnectedRepo) => {
    setSelectedRepo(r);
    setSettingsOpen(true);
  };
  const handleToggle = (r: ConnectedRepo) => toggleActive(r._id, !r.isActive);
  const handleDelete = (r: ConnectedRepo) => disconnectRepo(r._id);
  const handleSave = async (id: string, rules: Partial<RepositoryRule>) => {
    await updateRules(id, rules);
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
        {/* Header */}
        <PageHeader
          total={stats.total}
          onAdd={() => {
            setAddModalOpen(true);
            loadGitHubRepos();
          }}
        />

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <DashboardStatCard
            icon={BookOpen}
            label="Total Repos"
            value={stats.total}
            color={T.cyan}
            delay={0.1}
          />
          <DashboardStatCard
            icon={Activity}
            label="Active"
            value={stats.active}
            color={T.green}
            delay={0.15}
          />
          <DashboardStatCard
            icon={PauseCircle}
            label="Inactive"
            value={stats.inactive}
            color={T.muted}
            delay={0.2}
          />
          <DashboardStatCard
            icon={Code2}
            label="Languages"
            value={stats.langs}
            color={T.violet}
            delay={0.25}
          />
        </div>

        {/* Filters */}
        <FiltersBar
          search={searchTerm}
          setSearch={setSearchTerm}
          filter={filterActive}
          setFilter={setFilterActive}
          sort={sortField}
          setSort={setSortField}
          order={sortOrder}
          setOrder={setSortOrder}
          count={filtered.length}
          total={connectedRepos.length}
        />

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(310px, 100%), 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 0.08} />
              ))}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState filtered={!!(searchTerm || filterActive !== 'all')} />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(310px, 100%), 1fr))',
                gap: 16,
              }}
            >
              <AnimatePresence>
                {filtered.map((repo, i) => (
                  <RepositoryCard
                    key={repo._id}
                    repo={repo}
                    index={i}
                    delay={0.05 + i * 0.04}
                    onConfigure={handleConfigure}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Settings modal */}
      <AnimatePresence>
        {selectedRepo && settingsOpen && (
          <RepositorySettings
            key={selectedRepo._id}
            repo={selectedRepo}
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Add Repository modal */}
      <AnimatePresence>
        {addModalOpen && (
          <AddRepositoryModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            githubRepos={githubRepos}
            connectedRepos={connectedRepos}
            isConnecting={isConnecting}
            onConnect={connectRepo}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RepositoriesPage;
