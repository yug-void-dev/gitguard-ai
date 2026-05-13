/**
 * @file src/github/diffProcessor.ts
 * @description Diff preprocessing, cleaning & chunking pipeline.
 *
 * Transforms raw unified diff into clean, LLM-ready chunks with rich
 * context metadata. This is the spec-mandated DiffProcessor.
 *
 * Pipeline:
 *   rawDiff → parse file blocks → strip git metadata → detect language
 *   → skip generated files → chunk by token budget → add context headers
 *
 * Why separate from promptSanitizer?
 *   promptSanitizer.ts handles SECURITY (injection stripping).
 *   diffProcessor.ts handles STRUCTURE (parsing, cleaning, chunking).
 *   They compose: processedChunks → sanitiser → LLM.
 */

import { PRContext } from '../types/analysis';
import { logger } from '../lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessedFile {
  filename: string;
  language: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  cleanDiff: string;   // Git metadata stripped, only hunks + code lines
  additions: number;
  deletions: number;
  contextLines: number;
}

export interface DiffChunk {
  chunkIndex: number;
  totalChunks: number;    // Back-filled after all chunks created
  files: ProcessedFile[];
  /** Pre-formatted context header to prepend to the LLM prompt */
  contextHeader: string;
  /** Full chunk content = contextHeader + formatted file diffs */
  content: string;
  charCount: number;
}

export interface ProcessedDiff {
  chunks: DiffChunk[];
  allFiles: ProcessedFile[];
  skippedFiles: string[];
  totalAdditions: number;
  totalDeletions: number;
}

// ─── Configuration ────────────────────────────────────────────────────────────

/** Max characters per chunk (~12k chars ≈ ~3k tokens) */
const MAX_CHUNK_CHARS = 12_000;

/** File extensions → language names */
const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  mjs: 'JavaScript', py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust',
  java: 'Java', kt: 'Kotlin', swift: 'Swift', cs: 'C#', cpp: 'C++',
  c: 'C', php: 'PHP', sql: 'SQL', sh: 'Shell', bash: 'Shell',
  yaml: 'YAML', yml: 'YAML', json: 'JSON', md: 'Markdown',
  html: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue', svelte: 'Svelte',
};

/** Patterns for auto-generated / vendor / binary files to skip */
const SKIP_PATTERNS: RegExp[] = [
  /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/, /\.lock$/,
  /node_modules\//, /dist\//, /build\//, /\.min\.(js|css)$/,
  /\.map$/, /\.snap$/, /\.pb\.go$/, /\.generated\./, /migrations\/\d+/,
];

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Full diff processing pipeline.
 *
 * @param rawDiff  - Raw unified diff from GitHub
 * @param context  - PR context for enriching chunk headers
 * @param eventId  - Correlation ID for logging
 */
export function processDiff(
  rawDiff: string,
  context: PRContext,
  eventId: string,
): ProcessedDiff {
  const log = logger.child({ module: 'diffProcessor', eventId });
  log.debug({ rawBytes: rawDiff.length }, 'Starting diff processing');

  const { processedFiles, skippedFiles } = parseAndClean(rawDiff);
  const chunks = buildChunks(processedFiles, context);

  const totalAdditions = processedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = processedFiles.reduce((s, f) => s + f.deletions, 0);

  log.info({
    files: processedFiles.length,
    skipped: skippedFiles.length,
    chunks: chunks.length,
    totalAdditions,
    totalDeletions,
  }, 'Diff processing complete');

  return { chunks, allFiles: processedFiles, skippedFiles, totalAdditions, totalDeletions };
}

// ─── Parsing & Cleaning ───────────────────────────────────────────────────────

function parseAndClean(rawDiff: string): { processedFiles: ProcessedFile[]; skippedFiles: string[] } {
  const processedFiles: ProcessedFile[] = [];
  const skippedFiles: string[] = [];

  // Split on 'diff --git' markers (keep the marker by splitting before it)
  const blocks = rawDiff.split(/(?=^diff --git )/m).filter((b) => b.trim());

  for (const block of blocks) {
    const firstLine = block.split('\n')[0] ?? '';
    const headerMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(firstLine);
    if (!headerMatch) continue;

    const newPath = headerMatch[2];
    const filename = newPath;

    if (SKIP_PATTERNS.some((p) => p.test(filename))) {
      skippedFiles.push(filename);
      continue;
    }

    const lines = block.split('\n');
    const changeType = detectChangeType(lines);
    const { cleanDiff, additions, deletions, contextLines } = cleanBlock(lines);

    if (!cleanDiff.trim()) continue;

    processedFiles.push({
      filename,
      language: detectLanguage(filename),
      changeType,
      cleanDiff,
      additions,
      deletions,
      contextLines,
    });
  }

  return { processedFiles, skippedFiles };
}

function detectChangeType(lines: string[]): ProcessedFile['changeType'] {
  if (lines.some((l) => l.startsWith('new file mode')))     return 'added';
  if (lines.some((l) => l.startsWith('deleted file mode'))) return 'deleted';
  if (lines.some((l) => l.startsWith('rename from')))       return 'renamed';
  return 'modified';
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'Unknown';
}

/**
 * Strips git metadata headers from a file block.
 * Keeps: @@ hunk headers, + added lines, - removed lines, context lines.
 * Removes: index, mode, new/deleted file, rename, ---, +++ headers.
 */
function cleanBlock(lines: string[]): { cleanDiff: string; additions: number; deletions: number; contextLines: number } {
  const clean: string[] = [];
  let additions = 0;
  let deletions = 0;
  let contextLines = 0;
  let inHunk = false;

  for (const line of lines) {
    if (
      line.startsWith('diff --git') || line.startsWith('index ') ||
      line.startsWith('old mode') || line.startsWith('new mode') ||
      line.startsWith('new file mode') || line.startsWith('deleted file mode') ||
      line.startsWith('rename from') || line.startsWith('rename to') ||
      line.startsWith('similarity index') || line.startsWith('--- ') ||
      line.startsWith('+++ ') || line.startsWith('\\ No newline')
    ) continue;

    if (line.startsWith('@@')) {
      inHunk = true;
      clean.push(line);
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith('+'))      { additions++;    clean.push(line); }
    else if (line.startsWith('-')) { deletions++;    clean.push(line); }
    else                           { contextLines++; clean.push(line); }
  }

  return { cleanDiff: clean.join('\n'), additions, deletions, contextLines };
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function buildChunks(files: ProcessedFile[], context: PRContext): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let currentFiles: ProcessedFile[] = [];
  let currentChars = 0;

  const flush = (): void => {
    if (currentFiles.length === 0) return;
    chunks.push(buildChunk(currentFiles, chunks.length + 1, context));
    currentFiles = [];
    currentChars = 0;
  };

  for (const file of files) {
    const fileChars = file.cleanDiff.length;

    // File alone exceeds limit — give it its own chunk (truncated if needed)
    if (fileChars > MAX_CHUNK_CHARS) {
      flush();
      chunks.push(buildChunk([truncate(file)], chunks.length + 1, context));
      continue;
    }

    if (currentChars + fileChars > MAX_CHUNK_CHARS && currentFiles.length > 0) {
      flush();
    }

    currentFiles.push(file);
    currentChars += fileChars;
  }

  flush();

  // Back-fill totalChunks
  const total = chunks.length;
  return chunks.map((c) => ({ ...c, totalChunks: total }));
}

function buildChunk(files: ProcessedFile[], chunkIndex: number, ctx: PRContext): DiffChunk {
  const fileList = files
    .map((f) => `  • ${f.filename} [${f.language}] ${f.changeType} +${f.additions}/-${f.deletions}`)
    .join('\n');

  const contextHeader = [
    `Repository: ${ctx.repositoryFullName}`,
    `PR #${ctx.prNumber}: ${ctx.title}`,
    `Author: @${ctx.authorLogin}  Branch: ${ctx.headBranch} → ${ctx.baseBranch}`,
    `Language: ${ctx.language ?? 'Mixed'}  Changes: ${ctx.changedFiles} files +${ctx.additions}/-${ctx.deletions}`,
    ctx.description ? `Description: ${ctx.description.slice(0, 300)}` : '',
    `\nFiles in this chunk:\n${fileList}`,
  ].filter(Boolean).join('\n');

  const fileDiffs = files.map((f) =>
    `### File: ${f.filename}\nLanguage: ${f.language} | Change: ${f.changeType}\n\`\`\`diff\n${f.cleanDiff}\n\`\`\``
  ).join('\n\n');

  const content = `${contextHeader}\n\n${fileDiffs}`;

  return {
    chunkIndex,
    totalChunks: 0, // back-filled
    files,
    contextHeader,
    content,
    charCount: content.length,
  };
}

function truncate(file: ProcessedFile): ProcessedFile {
  const lines = file.cleanDiff.split('\n');
  const truncated: string[] = [];
  let chars = 0;

  for (const line of lines) {
    if (chars + line.length > MAX_CHUNK_CHARS) break;
    truncated.push(line);
    chars += line.length + 1;
  }

  truncated.push('\n[... truncated — file too large for single chunk ...]');

  return { ...file, cleanDiff: truncated.join('\n') };
}
