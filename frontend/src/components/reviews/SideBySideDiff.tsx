/**
 * @file components/reviews/SideBySideDiff.tsx
 * @description Highly visual, premium side-by-side diff viewer.
 * Parses unified diff strings and aligns deletions/additions side-by-side
 * using grid alignments without any external libraries.
 */

import React, { useMemo } from 'react';
import { FileCode, GitPullRequest } from 'lucide-react';
import { T } from '../../constants/theme';

interface SideBySideDiffProps {
  diff: string;
}

interface DiffCell {
  lineNum?: number;
  content: string;
  type: 'added' | 'deleted' | 'normal' | 'empty';
}

interface DiffRow {
  left: DiffCell;
  right: DiffCell;
}

interface FileDiff {
  filename: string;
  rows: DiffRow[];
}

/**
 * Parses standard unified diff format string into list of files and their aligned side-by-side rows.
 */
function parseUnifiedDiff(diffStr: string): FileDiff[] {
  if (!diffStr) return [];

  const files: FileDiff[] = [];
  const lines = diffStr.split('\n');

  let currentFile: FileDiff | null = null;
  let leftLineNum = 1;
  let rightLineNum = 1;

  let deletions: { content: string; lineNum: number }[] = [];
  let additions: { content: string; lineNum: number }[] = [];

  const flushChanges = (rows: DiffRow[]) => {
    const len = Math.max(deletions.length, additions.length);
    for (let i = 0; i < len; i++) {
      const del = deletions[i];
      const add = additions[i];

      rows.push({
        left: del
          ? { lineNum: del.lineNum, content: del.content, type: 'deleted' }
          : { content: '', type: 'empty' },
        right: add
          ? { lineNum: add.lineNum, content: add.content, type: 'added' }
          : { content: '', type: 'empty' },
      });
    }
    deletions = [];
    additions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      // Flush previous file remaining changes
      if (currentFile) {
        flushChanges(currentFile.rows);
      }

      // Extract filename
      // Format: diff --git a/path/to/file b/path/to/file
      const parts = line.split(' ');
      let filename = parts[parts.length - 1] || 'unknown_file';
      if (filename.startsWith('b/')) {
        filename = filename.substring(2);
      }

      currentFile = {
        filename,
        rows: [],
      };
      files.push(currentFile);
      leftLineNum = 1;
      rightLineNum = 1;
      deletions = [];
      additions = [];
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) {
      // File header metadata, ignore or skip
      continue;
    }

    if (line.startsWith('@@')) {
      // Flush any accumulated changes before starting new chunk
      flushChanges(currentFile.rows);

      // Parse chunk header: @@ -leftStart,leftLen +rightStart,rightLen @@
      const match = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        leftLineNum = parseInt(match[1], 10);
        rightLineNum = parseInt(match[2], 10);
      }
      continue;
    }

    // Process diff line codes
    if (line.startsWith('-')) {
      deletions.push({
        lineNum: leftLineNum++,
        content: line.substring(1),
      });
    } else if (line.startsWith('+')) {
      additions.push({
        lineNum: rightLineNum++,
        content: line.substring(1),
      });
    } else {
      // Context or normal unchanged line
      flushChanges(currentFile.rows);

      // Strip leading space if any
      const content = line.startsWith(' ') ? line.substring(1) : line;
      currentFile.rows.push({
        left: { lineNum: leftLineNum++, content, type: 'normal' },
        right: { lineNum: rightLineNum++, content, type: 'normal' },
      });
    }
  }

  // Flush last file remaining changes
  if (currentFile) {
    flushChanges(currentFile.rows);
  }

  return files;
}

export const SideBySideDiff: React.FC<SideBySideDiffProps> = ({ diff }) => {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);

  if (files.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: T.muted }}>
        No code changes found in this diff.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {files.map((file, fileIdx) => (
        <div
          key={fileIdx}
          style={{
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            background: '#030712',
            overflow: 'hidden',
          }}
        >
          {/* File Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: '#090d16',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.red }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.green }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <FileCode size={14} color={T.cyan} />
                <span
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  {file.filename}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitPullRequest size={13} color={T.muted} />
              <span
                style={{
                  fontSize: 10,
                  color: T.muted,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}
              >
                Split View
              </span>
            </div>
          </div>

          {/* Split Panes Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(255,255,255,0.01)',
              borderBottom: `1px solid ${T.border}30`,
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: T.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <div style={{ padding: '6px 12px', borderRight: `1px solid ${T.border}30` }}>Original Code</div>
            <div style={{ padding: '6px 12px' }}>Modified Code</div>
          </div>

          {/* Split Diff Content Stream */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 800, fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.6 }}>
              {file.rows.map((row, rowIdx) => {
                // Determine styling for left cell
                let leftBg = 'transparent';
                let leftColor = T.text;
                if (row.left.type === 'deleted') {
                  leftBg = 'rgba(239, 68, 68, 0.12)';
                  leftColor = '#fca5a5';
                } else if (row.left.type === 'empty') {
                  leftBg = 'rgba(255, 255, 255, 0.02)';
                }

                // Determine styling for right cell
                let rightBg = 'transparent';
                let rightColor = T.text;
                if (row.right.type === 'added') {
                  rightBg = 'rgba(16, 185, 129, 0.12)';
                  rightColor = '#a7f3d0';
                } else if (row.right.type === 'empty') {
                  rightBg = 'rgba(255, 255, 255, 0.02)';
                }

                return (
                  <div
                    key={rowIdx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderBottom: `1px solid rgba(255,255,255,0.02)`,
                    }}
                  >
                    {/* Left Pane (Original / Deleted) */}
                    <div
                      style={{
                        display: 'flex',
                        background: leftBg,
                        color: leftColor,
                        borderRight: `1px solid ${T.border}30`,
                        minHeight: 22,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          flexShrink: 0,
                          textAlign: 'right',
                          paddingRight: 8,
                          color: 'rgba(255,255,255,0.2)',
                          userSelect: 'none',
                          fontSize: 10,
                          fontWeight: 500,
                          borderRight: `1px solid rgba(255,255,255,0.03)`,
                          marginRight: 8,
                        }}
                      >
                        {row.left.lineNum ?? ''}
                      </div>
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          paddingRight: 8,
                        }}
                      >
                        {row.left.content}
                      </div>
                    </div>

                    {/* Right Pane (Modified / Added) */}
                    <div
                      style={{
                        display: 'flex',
                        background: rightBg,
                        color: rightColor,
                        minHeight: 22,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          flexShrink: 0,
                          textAlign: 'right',
                          paddingRight: 8,
                          color: 'rgba(255,255,255,0.2)',
                          userSelect: 'none',
                          fontSize: 10,
                          fontWeight: 500,
                          borderRight: `1px solid rgba(255,255,255,0.03)`,
                          marginRight: 8,
                        }}
                      >
                        {row.right.lineNum ?? ''}
                      </div>
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          paddingRight: 8,
                        }}
                      >
                        {row.right.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
