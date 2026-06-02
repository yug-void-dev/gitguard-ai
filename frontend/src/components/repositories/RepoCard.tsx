/**
 * @file components/repositories/RepoCard.tsx
 * @description Card for a connected GitHub repository showing status,
 * language, and quick-action buttons (config / disconnect / toggle).
 */

import React, { useState } from 'react';
import {
  GitBranch,
  Star,
  Trash2,
  Settings2,
  Power,
  PowerOff,
  ExternalLink,
} from 'lucide-react';
import type { ConnectedRepo } from '../../types/repository.types';
import Badge from '../common/Badge';
import Tooltip from '../common/Tooltip';

interface RepoCardProps {
  repo: ConnectedRepo;
  onConfigure: (repo: ConnectedRepo) => void;
  onDisconnect: (repoId: string) => void;
  onToggle: (repoId: string, isActive: boolean) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({
  repo,
  onConfigure,
  onDisconnect,
  onToggle,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const repoName =
    repo.repositoryFullName.split('/')[1] ?? repo.repositoryFullName;
  const ownerName = repo.repositoryFullName.split('/')[0] ?? '';

  return (
    <div
      style={{
        background: 'rgba(10,11,30,0.7)',
        border: `1px solid ${repo.isActive ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)'}`,
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: repo.isActive ? 1 : 0.65,
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <GitBranch size={18} color="#818cf8" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(148,163,184,0.5)',
              }}
            >
              {ownerName}/
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: '#e2e8f0',
              }}
            >
              {repoName}
            </span>
            <a
              href={`https://github.com/${repo.repositoryFullName}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#64748b', lineHeight: 0 }}
            >
              <ExternalLink size={12} color="#64748b" />
            </a>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 4,
            }}
          >
            <Badge
              variant={repo.isActive ? 'success' : 'default'}
              dot={repo.isActive}
            >
              {repo.isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Rules summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {repo.rules.strictMode && (
          <span style={chipStyle('#f87171')}>Strict Mode</span>
        )}
        {repo.rules.ignoreLinting && (
          <span style={chipStyle('#94a3b8')}>No Linting</span>
        )}
        {repo.rules.checkPerformance && (
          <span style={chipStyle('#fbbf24')}>Perf Check</span>
        )}
        <span style={chipStyle('#818cf8')}>
          {Math.round(repo.rules.minConfidence * 100)}% min conf
        </span>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderTop: '1px solid rgba(99,102,241,0.08)',
          paddingTop: 10,
        }}
      >
        <Tooltip content="Configure rules">
          <button
            onClick={() => onConfigure(repo)}
            style={actionBtn('#818cf8')}
          >
            <Settings2 size={14} />
          </button>
        </Tooltip>

        <Tooltip
          content={repo.isActive ? 'Pause monitoring' : 'Resume monitoring'}
        >
          <button
            onClick={() => onToggle(repo._id, !repo.isActive)}
            style={actionBtn(repo.isActive ? '#fbbf24' : '#34d399')}
          >
            {repo.isActive ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </Tooltip>

        {confirmDelete ? (
          <>
            <button
              onClick={() => {
                onDisconnect(repo._id);
                setConfirmDelete(false);
              }}
              style={{
                ...actionBtn('#f87171'),
                fontSize: 11,
                padding: '5px 10px',
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                ...actionBtn('#94a3b8'),
                fontSize: 11,
                padding: '5px 10px',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <Tooltip content="Disconnect repository">
            <button
              onClick={() => setConfirmDelete(true)}
              style={actionBtn('#f87171')}
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        )}

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <GitBranch size={12} color="#64748b" />
          <span
            style={{
              fontSize: 10,
              color: '#64748b',
              fontFamily: 'var(--font-mono)',
            }}
          >
            webhook
          </span>
          <Star size={10} color="#64748b" />
        </div>
      </div>
    </div>
  );
};

const chipStyle = (color: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color,
  background: `${color}15`,
  border: `1px solid ${color}30`,
  borderRadius: 6,
  padding: '2px 7px',
  fontFamily: 'var(--font-mono)',
});

const actionBtn = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 8,
  background: `${color}12`,
  border: `1px solid ${color}25`,
  color,
  cursor: 'pointer',
  transition: 'all 0.15s',
  padding: 0,
});

export default RepoCard;
