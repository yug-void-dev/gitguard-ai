/**
 * @file components/reviews/SideBySideDiff.tsx
 * @description Premium, clean side-by-side diff viewer with contextual annotations.
 * Parses unified diff strings, aligns deletions/additions side-by-side,
 * and highlights them clearly with a matching dark theme.
 */

import React, { useMemo, useState } from 'react';
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  Code2,
  AlertTriangle,
  CheckCircle,
  GitCompare,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  isHunk?: boolean; // separator between diff chunks
  hunkHeader?: string;
}

interface FileDiff {
  filename: string;
  rows: DiffRow[];
  addedLines: number;
  removedLines: number;
}

// ─── Diff Parser ─────────────────────────────────────────────────────────────

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

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (currentFile) flushChanges(currentFile.rows);
      const parts = line.split(' ');
      let filename = parts[parts.length - 1] || 'unknown_file';
      if (filename.startsWith('b/')) filename = filename.substring(2);
      currentFile = { filename, rows: [], addedLines: 0, removedLines: 0 };
      files.push(currentFile);
      leftLineNum = 1;
      rightLineNum = 1;
      deletions = [];
      additions = [];
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) continue;

    if (line.startsWith('@@')) {
      flushChanges(currentFile.rows);
      const match = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@(.*)/);
      if (match) {
        leftLineNum = parseInt(match[1], 10);
        rightLineNum = parseInt(match[2], 10);
        // Add a hunk separator row
        if (currentFile.rows.length > 0) {
          currentFile.rows.push({
            left: { content: '', type: 'normal' },
            right: { content: '', type: 'normal' },
            isHunk: true,
            hunkHeader: match[3]?.trim() || '',
          });
        }
      }
      continue;
    }

    if (line.startsWith('-')) {
      deletions.push({ lineNum: leftLineNum++, content: line.substring(1) });
      currentFile.removedLines++;
    } else if (line.startsWith('+')) {
      additions.push({ lineNum: rightLineNum++, content: line.substring(1) });
      currentFile.addedLines++;
    } else {
      flushChanges(currentFile.rows);
      const content = line.startsWith(' ') ? line.substring(1) : line;
      currentFile.rows.push({
        left: { lineNum: leftLineNum++, content, type: 'normal' },
        right: { lineNum: rightLineNum++, content, type: 'normal' },
      });
    }
  }

  if (currentFile) flushChanges(currentFile.rows);
  return files;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getFileBadgeColor(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#61dafb',
    py: '#3776ab', go: '#00add8', rb: '#cc342d', json: '#92400e',
    css: '#264de4', html: '#e34c26', md: '#083fa1',
  };
  return map[ext] || '#6366f1';
}

// ─── Cell Component ───────────────────────────────────────────────────────────

const DiffCellView: React.FC<{
  cell: DiffCell;
  side: 'left' | 'right';
}> = ({ cell, side }) => {
  const isLeft = side === 'left';

  // Colors per type
  const bgMap = {
    deleted: 'rgba(239,68,68,0.10)',
    added:   'rgba(16,185,129,0.10)',
    empty:   'rgba(0,0,0,0.15)',
    normal:  'transparent',
  };
  const textMap = {
    deleted: '#fca5a5',
    added:   '#6ee7b7',
    empty:   'transparent',
    normal:  '#cbd5e1',
  };
  const borderMap = {
    deleted: 'rgba(239,68,68,0.25)',
    added:   'rgba(16,185,129,0.25)',
    empty:   'transparent',
    normal:  'transparent',
  };
  const markerMap = {
    deleted: { char: '−', color: '#ef4444' },
    added:   { char: '+', color: '#10b981' },
    empty:   { char: '',  color: 'transparent' },
    normal:  { char: '',  color: 'transparent' },
  };

  const bg     = bgMap[cell.type];
  const color  = textMap[cell.type];
  const border = borderMap[cell.type];
  const marker = markerMap[cell.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        background: bg,
        borderLeft: `2px solid ${border}`,
        minHeight: 28,
        flex: 1,
        overflow: 'hidden',
        borderRight: isLeft ? `1px solid rgba(255,255,255,0.04)` : 'none',
      }}
    >
      {/* Marker column (+ / −) */}
      <div
        style={{
          width: 18,
          flexShrink: 0,
          textAlign: 'center',
          paddingTop: 5,
          fontSize: 11,
          fontWeight: 700,
          color: marker.color,
          opacity: marker.char ? 0.85 : 0,
          userSelect: 'none',
          fontFamily: "'Fira Code', monospace",
        }}
      >
        {marker.char}
      </div>

      {/* Line number column */}
      <div
        style={{
          width: 38,
          flexShrink: 0,
          textAlign: 'right',
          paddingRight: 10,
          paddingTop: 5,
          color: cell.type === 'deleted' ? 'rgba(252,165,165,0.4)'
               : cell.type === 'added'   ? 'rgba(110,231,183,0.4)'
               : 'rgba(255,255,255,0.18)',
          userSelect: 'none',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'Fira Code', monospace",
          borderRight: '1px solid rgba(255,255,255,0.05)',
          marginRight: 10,
        }}
      >
        {cell.lineNum ?? ''}
      </div>

      {/* Code content */}
      <div
        style={{
          flex: 1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          paddingTop: 5,
          paddingBottom: 5,
          paddingRight: 12,
          color,
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: "'Fira Code', monospace",
          fontWeight: cell.type === 'normal' ? 400 : 500,
        }}
      >
        {cell.content || (cell.type === 'empty' ? '' : '\u00A0')}
      </div>
    </div>
  );
};

// ─── File Block Component ─────────────────────────────────────────────────────

const FileDiffBlock: React.FC<{ file: FileDiff; index: number }> = ({ file, index }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const badgeColor = getFileBadgeColor(file.filename);
  const ext = getFileExtension(file.filename);

  // Stats
  const totalChanges = file.addedLines + file.removedLines;
  const hasOnlyAdditions = file.removedLines === 0 && file.addedLines > 0;
  const hasOnlyRemovals = file.addedLines === 0 && file.removedLines > 0;

  // Collect all right-side (added + normal context) lines as the "modified" code
  const copyModifiedCode = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't collapse the block
    const lines = file.rows
      .filter((r) => !r.isHunk)
      .map((r) => r.right)
      .filter((cell) => cell.type === 'added' || cell.type === 'normal')
      .map((cell) => cell.content)
      .join('\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.07)`,
        background: '#060c18',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* ─── File Header ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.025)',
          borderBottom: collapsed ? 'none' : `1px solid rgba(255,255,255,0.06)`,
          cursor: 'pointer',
          userSelect: 'none',
          gap: 12,
          flexWrap: 'wrap',
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        {/* Left: File info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Collapse indicator */}
          <span style={{ color: T.muted, display: 'flex', alignItems: 'center' }}>
            {collapsed
              ? <ChevronRight size={15} />
              : <ChevronDown size={15} />}
          </span>

          {/* File icon + badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `${badgeColor}18`,
              border: `1px solid ${badgeColor}35`,
            }}
          >
            <FileCode size={14} color={badgeColor} />
          </div>

          {/* Filename */}
          <div>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                letterSpacing: '0.01em',
              }}
            >
              {file.filename}
            </span>
            {ext && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: `${badgeColor}20`,
                  color: badgeColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {ext}
              </span>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Change bar visualization */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {totalChanges > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: Math.min(totalChanges, 10) }).map((_, i) => {
                  const isRemoved = i < Math.min(file.removedLines, 5);
                  const addRatio = file.addedLines / (totalChanges || 1);
                  const normalized = Math.round(addRatio * Math.min(totalChanges, 10));
                  const isAdded = i >= (Math.min(totalChanges, 10) - normalized);
                  return (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 12,
                        borderRadius: 2,
                        background: isAdded ? '#10b981' : isRemoved ? '#ef4444' : '#10b981',
                        opacity: 0.75,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* +/- numbers */}
          {file.addedLines > 0 && (
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 700, color: '#10b981',
                fontFamily: "'Fira Code', monospace",
                background: 'rgba(16,185,129,0.1)',
                padding: '3px 8px', borderRadius: 6,
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <Plus size={10} /> {file.addedLines}
            </span>
          )}
          {file.removedLines > 0 && (
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 700, color: '#ef4444',
                fontFamily: "'Fira Code', monospace",
                background: 'rgba(239,68,68,0.1)',
                padding: '3px 8px', borderRadius: 6,
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <Minus size={10} /> {file.removedLines}
            </span>
          )}

          {/* Status badge */}
          {hasOnlyAdditions && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              <CheckCircle size={11} /> NEW
            </span>
          )}
          {hasOnlyRemovals && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#ef4444', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              <AlertTriangle size={11} /> REMOVED
            </span>
          )}
          {!hasOnlyAdditions && !hasOnlyRemovals && totalChanges > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#f59e0b', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              <GitCompare size={11} /> MODIFIED
            </span>
          )}
        </div>
      </div>

      {/* ─── Column Labels ──────────────────────────────────────── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                fontFamily: "'Inter', sans-serif",
                fontSize: 9.5,
                fontWeight: 700,
                color: T.muted,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                background: 'rgba(255,255,255,0.015)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  padding: '7px 16px 7px 68px',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(252,165,165,0.6)',
                }}
              >
                <Minus size={10} />
                Original Code (Before)
              </div>
              <div
                style={{
                  padding: '7px 16px 7px 68px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  color: 'rgba(110,231,183,0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={10} />
                  Modified Code (After)
                </div>

                {/* ── Copy Modified Code Button ── */}
                <motion.button
                  onClick={copyModifiedCode}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.93 }}
                  title="Copy modified code to clipboard"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 7,
                    border: copied
                      ? '1px solid rgba(16,185,129,0.5)'
                      : '1px solid rgba(110,231,183,0.2)',
                    background: copied
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(110,231,183,0.06)',
                    color: copied ? '#10b981' : 'rgba(110,231,183,0.7)',
                    cursor: 'pointer',
                    fontSize: 9.5,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    marginRight: 4,
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Check size={10} />
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Copy size={10} />
                        Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* ─── Diff Rows ──────────────────────────────────────── */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 700 }}>
                {file.rows.map((row, rowIdx) => {
                  // Hunk separator
                  if (row.isHunk) {
                    return (
                      <div
                        key={rowIdx}
                        style={{
                          padding: '4px 16px',
                          background: 'rgba(99,102,241,0.06)',
                          borderTop: '1px solid rgba(99,102,241,0.15)',
                          borderBottom: '1px solid rgba(99,102,241,0.15)',
                          fontSize: 10,
                          color: 'rgba(129,140,248,0.5)',
                          fontFamily: "'Fira Code', monospace",
                          letterSpacing: '0.3px',
                        }}
                      >
                        {row.hunkHeader ? `… ${row.hunkHeader}` : '…'}
                      </div>
                    );
                  }

                  const isChanged =
                    row.left.type === 'deleted' ||
                    row.right.type === 'added' ||
                    row.left.type === 'empty' ||
                    row.right.type === 'empty';

                  return (
                    <div
                      key={rowIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        borderBottom: isChanged
                          ? '1px solid rgba(255,255,255,0.035)'
                          : '1px solid rgba(255,255,255,0.018)',
                      }}
                    >
                      <DiffCellView cell={row.left}  side="left" />
                      <DiffCellView cell={row.right} side="right" />
                    </div>
                  );
                })}

                {/* Empty state if no rows */}
                {file.rows.length === 0 && (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: T.muted,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                    }}
                  >
                    No content lines to display.
                  </div>
                )}
              </div>
            </div>

            {/* ─── Footer Summary ────────────────────────────────── */}
            <div
              style={{
                padding: '8px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.012)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: T.muted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Code2 size={11} />
                {file.rows.filter((r) => !r.isHunk).length} lines shown
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                {file.removedLines > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(252,165,165,0.55)', fontFamily: "'Inter', sans-serif" }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{file.removedLines}</span> line{file.removedLines !== 1 ? 's' : ''} removed
                  </span>
                )}
                {file.addedLines > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(110,231,183,0.55)', fontFamily: "'Inter', sans-serif" }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{file.addedLines}</span> line{file.addedLines !== 1 ? 's' : ''} added
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const SideBySideDiff: React.FC<SideBySideDiffProps> = ({ diff }) => {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);

  if (files.length === 0) {
    return (
      <div
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: T.muted,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: `1px solid rgba(255,255,255,0.06)`,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
        }}
      >
        No code diff available for this review.
      </div>
    );
  }

  const totalAdded   = files.reduce((s, f) => s + f.addedLines, 0);
  const totalRemoved = files.reduce((s, f) => s + f.removedLines, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─── Top Summary Bar ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 16px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: T.sub,
            fontFamily: "'Inter', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.8px',
          }}
        >
          <GitCompare size={13} color={T.cyan} />
          Diff Summary
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'Inter', sans-serif" }}>
          <strong style={{ color: '#e2e8f0' }}>{files.length}</strong> file{files.length !== 1 ? 's' : ''} changed
        </span>
        {totalAdded > 0 && (
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, color: '#10b981',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            <Plus size={11} /> {totalAdded} added
          </span>
        )}
        {totalRemoved > 0 && (
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, color: '#ef4444',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            <Minus size={11} /> {totalRemoved} removed
          </span>
        )}
      </div>

      {/* ─── File Blocks ──────────────────────────────────────────── */}
      {files.map((file, i) => (
        <FileDiffBlock key={file.filename + i} file={file} index={i} />
      ))}
    </div>
  );
};
