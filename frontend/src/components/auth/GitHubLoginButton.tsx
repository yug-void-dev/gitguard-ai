/**
 * @file components/auth/GitHubLoginButton.tsx
 * @description GitHub OAuth login button.
 * Redirects to the backend GitHub OAuth initiation endpoint.
 */

import React from 'react';
import { GITHUB_OAUTH_URL } from '../../constants/config';

/** Inline GitHub mark SVG — avoids dependency on lucide-react's removed Github icon */
const GitHubIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.332-1.755-1.332-1.755-1.089-.744.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

interface GitHubLoginButtonProps {
  className?: string;
}

const GitHubLoginButton: React.FC<GitHubLoginButtonProps> = ({ className }) => {
  const handleClick = () => {
    window.location.href = GITHUB_OAUTH_URL;
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '11px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        color: '#e2e8f0',
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: 0.2,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(255,255,255,0.1)';
        el.style.borderColor = 'rgba(255,255,255,0.25)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(255,255,255,0.05)';
        el.style.borderColor = 'rgba(255,255,255,0.12)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <GitHubIcon size={18} />
      Continue with GitHub
    </button>
  );
};

export default GitHubLoginButton;
