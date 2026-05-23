/**
 * @file components/repositories/RepoRuleConfig.tsx
 * @description Modal panel for configuring per-repository AI review rules.
 * Shown when clicking "Configure" on a RepoCard.
 */

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Eye, Percent } from 'lucide-react';
import type { ConnectedRepo, RepositoryRule } from '../../types/repository.types';
import Modal from '../common/Modal';
import Button from '../common/Button';

interface RepoRuleConfigProps {
  repo: ConnectedRepo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (repoId: string, rules: Partial<RepositoryRule>) => Promise<void>;
}

const RepoRuleConfig: React.FC<RepoRuleConfigProps> = ({
  repo,
  isOpen,
  onClose,
  onSave,
}) => {
  const [rules, setRules] = useState<RepositoryRule>({
    strictMode: false,
    ignoreLinting: false,
    checkPerformance: true,
    minConfidence: 0.7,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (repo) setRules({ ...repo.rules });
  }, [repo]);

  const handleSave = async () => {
    if (!repo) return;
    setSaving(true);
    try {
      await onSave(repo._id, rules);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configure — ${repo?.repositoryFullName}`} maxWidth={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Toggle rows */}
        <ToggleRow
          icon={<Shield size={15} color="#f87171" />}
          label="Strict Mode"
          description="Fail the review on any high-severity finding"
          checked={rules.strictMode}
          onChange={(v) => setRules((r) => ({ ...r, strictMode: v }))}
        />
        <ToggleRow
          icon={<Eye size={15} color="#94a3b8" />}
          label="Ignore Linting Issues"
          description="Skip stylistic and linter warnings in the analysis"
          checked={rules.ignoreLinting}
          onChange={(v) => setRules((r) => ({ ...r, ignoreLinting: v }))}
        />
        <ToggleRow
          icon={<Zap size={15} color="#fbbf24" />}
          label="Check Performance"
          description="Include performance anti-pattern detection"
          checked={rules.checkPerformance}
          onChange={(v) => setRules((r) => ({ ...r, checkPerformance: v }))}
        />

        {/* Confidence slider */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Percent size={15} color="#818cf8" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'var(--font-body)' }}>
              Min Confidence
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: '#818cf8',
              }}
            >
              {Math.round(rules.minConfidence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(rules.minConfidence * 100)}
            onChange={(e) =>
              setRules((r) => ({ ...r, minConfidence: Number(e.target.value) / 100 }))
            }
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>
            Only report findings with confidence ≥ {Math.round(rules.minConfidence * 100)}%
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} style={{ flex: 1 }}>
            Save Rules
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Toggle row ───────────────────────────────────────────────────────────────

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, description, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(99,102,241,0.1)',
      borderRadius: 10,
    }}
  >
    {icon}
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0, fontFamily: 'var(--font-body)' }}>
        {label}
      </p>
      <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '2px 0 0', fontFamily: 'var(--font-body)' }}>
        {description}
      </p>
    </div>
    {/* Toggle switch */}
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'linear-gradient(135deg, #6366f1, #22d3ee)' : 'rgba(100,116,139,0.3)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.25s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  </div>
);

export default RepoRuleConfig;
