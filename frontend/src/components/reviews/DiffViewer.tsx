/**
 * @file components/reviews/DiffViewer.tsx
 * @description Syntax-highlighted Git diff viewer.
 * Renders the raw diff string with line-level +/- colouring.
 * No external syntax-highlight library — plain DOM rendering keeps bundle lean.
 */

import React, { useMemo } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  maxLines?: number;
}

type LineType = 'add' | 'remove' | 'header' | 'context' | 'meta';

interface DiffLine {
  type: LineType;
  content: string;
  lineNum?: number;
}

function parseDiff(raw: string): DiffLine[] {
  return raw.split('\n').map((line) => {
    if (line.startsWith('+++') || line.startsWith('---')) return { type: 'meta', content: line };
    if (line.startsWith('@@')) return { type: 'header', content: line };
    if (line.startsWith('+')) return { type: 'add', content: line };
    if (line.startsWith('-')) return { type: 'remove', content: line };
    return { type: 'context', content: line };
  });
}

const LINE_STYLES: Record<LineType, React.CSSProperties> = {
  add: { background: 'rgba(52,211,153,0.08)', borderLeft: '3px solid #34d399', color: '#a7f3d0' },
  remove: { background: 'rgba(248,113,113,0.08)', borderLeft: '3px solid #f87171', color: '#fca5a5' },
  header: { background: 'rgba(99,102,241,0.1)', borderLeft: '3px solid #818cf8', color: '#c7d2fe' },
  meta: { background: 'transparent', borderLeft: '3px solid transparent', color: '#64748b' },
  context: { background: 'transparent', borderLeft: '3px solid transparent', color: '#94a3b8' },
};

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, maxLines = 200 }) => {
  const [copied, setCopied] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  const lines = useMemo(() => parseDiff(diff), [diff]);
  const visibleLines = showAll ? lines : lines.slice(0, maxLines);
  const truncated = lines.length > maxLines && !showAll;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        background: 'rgba(6,7,20,0.9)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          background: 'rgba(10,11,30,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Code2 size={14} color="#818cf8" />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#94a3b8',
            }}
          >
            Diff ({lines.length} lines)
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'none',
            border: 'none',
            color: copied ? '#34d399' : '#64748b',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'var(--font-body)',
            padding: '3px 8px',
            borderRadius: 6,
            transition: 'color 0.2s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Diff content */}
      <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
        <pre
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {visibleLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                ...LINE_STYLES[line.type],
                minHeight: 22,
              }}
            >
              <span
                style={{
                  minWidth: 44,
                  padding: '0 8px',
                  color: 'rgba(148,163,184,0.25)',
                  userSelect: 'none',
                  fontSize: 10,
                  lineHeight: '22px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ padding: '0 12px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                {line.content}
              </span>
            </div>
          ))}
        </pre>
      </div>

      {/* Show more */}
      {truncated && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(99,102,241,0.06)',
            border: 'none',
            borderTop: '1px solid rgba(99,102,241,0.1)',
            color: '#818cf8',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
          }}
        >
          Show {lines.length - maxLines} more lines…
        </button>
      )}
    </div>
  );
};

export default DiffViewer;
