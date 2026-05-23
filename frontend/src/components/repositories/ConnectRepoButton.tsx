/**
 * @file components/repositories/ConnectRepoButton.tsx
 * @description Button + modal picker that lets users browse their GitHub repos
 * and connect one to GitGuard AI.
 */

import React, { useState } from 'react';
import { Plus, Search, Github, Loader2, Lock, Globe } from 'lucide-react';
import type { Repository } from '../../types/repository.types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

interface ConnectRepoButtonProps {
  githubRepos: Repository[];
  isLoading: boolean;
  isConnecting: boolean;
  onOpen: () => void;
  onConnect: (fullName: string, repoId: number) => Promise<void>;
}

const ConnectRepoButton: React.FC<ConnectRepoButtonProps> = ({
  githubRepos,
  isLoading,
  isConnecting,
  onOpen,
  onConnect,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState<number | null>(null);

  const handleOpen = () => {
    setModalOpen(true);
    onOpen();
  };

  const filtered = githubRepos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleConnect = async (repo: Repository) => {
    setConnecting(repo.id);
    try {
      await onConnect(repo.fullName, repo.id);
      setModalOpen(false);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        leftIcon={<Plus size={15} />}
        onClick={handleOpen}
      >
        Connect Repository
      </Button>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Connect a GitHub Repository"
        maxWidth={540}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              color="#64748b"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              autoFocus
              type="text"
              placeholder="Search repositories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px 9px 30px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Repo list */}
          <div
            style={{
              maxHeight: 360,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner />
              </div>
            ) : filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: 13, padding: 24 }}>
                No repositories found
              </p>
            ) : (
              filtered.map((repo) => (
                <div
                  key={repo.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(99,102,241,0.1)',
                    borderRadius: 10,
                    transition: 'background 0.15s',
                  }}
                >
                  <Github size={16} color="#818cf8" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#e2e8f0',
                        margin: 0,
                        fontFamily: 'var(--font-body)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {repo.fullName}
                    </p>
                    {repo.description && (
                      <p
                        style={{
                          fontSize: 11,
                          color: 'rgba(148,163,184,0.5)',
                          margin: '2px 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {repo.isPrivate ? (
                      <Lock size={11} color="#94a3b8" />
                    ) : (
                      <Globe size={11} color="#94a3b8" />
                    )}
                    {repo.language && (
                      <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        {repo.language}
                      </span>
                    )}
                    <button
                      onClick={() => handleConnect(repo)}
                      disabled={isConnecting || connecting !== null}
                      style={{
                        padding: '4px 12px',
                        background: connecting === repo.id
                          ? 'rgba(99,102,241,0.3)'
                          : 'linear-gradient(135deg, #6366f1, #22d3ee)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {connecting === repo.id ? (
                        <><Loader2 size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> Connecting…</>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ConnectRepoButton;
