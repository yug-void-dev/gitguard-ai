/**
 * @file src/github/diffProcessor.ts
 * @description Diff preprocessing, cleaning and chunking pipeline.
 *
 * Pipeline: rawDiff → parse file blocks → strip git metadata
 *           → detect language → skip generated files → chunk
 */

import { PRContext } from '../types/analysis';
import { logger } from '../lib/logger';

export interface ProcessedFile {
  filename: string;
  language: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  cleanDiff: string;
  additions: number;
  deletions: number;
  contextLines: number;
}

export interface DiffChunk {
  chunkIndex: number;
  totalChunks: number;
  files: ProcessedFile[];
  contextHeader: string;
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

const MAX_CHUNK_CHARS = 12_000;

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  mjs: 'JavaScript', py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust',
  java: 'Java', kt: 'Kotlin', swift: 'Swift', cs: 'C#', cpp: 'C++',
  c: 'C', php: 'PHP', sql: 'SQL', sh: 'Shell', bash: 'Shell',
  yaml: 'YAML', yml: 'YAML', json: 'JSON', md: 'Markdown',
  html: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue', svelte: 'Svelte',
};

const SKIP_PATTERNS: RegExp[] = [
  /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/, /\.lock$/,
  /node_modules\//, /dist\//, /build\//, /\.min\.(js|css)$/, /\.map$/,
  /\.snap$/, /\.pb\.go$/, /\.generated\./, /migrations\/\d+/,
];

export function processDiff(rawDiff: string, context: PRContext, eventId: string): ProcessedDiff {
  const log = logger.child({ module: 'diffProcessor', eventId });
  log.debug({ rawBytes: rawDiff.length }, 'Starting diff processing');

  const { processedFiles, skippedFiles } = parseAndClean(rawDiff);
  const chunks = buildChunks(processedFiles, context);
  const totalAdditions = processedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = processedFiles.reduce((s, f) => s + f.deletions, 0);

  log.info({ files: processedFiles.length, skipped: skippedFiles.length, chunks: chunks.length }, 'Diff processing complete');
  return { chunks, allFiles: processedFiles, skippedFiles, totalAdditions, totalDeletions };
}

function parseAndClean(rawDiff: string): { processedFiles: ProcessedFile[]; skippedFiles: string[] } {
  const processedFiles: ProcessedFile[] = [];
  const skippedFiles: string[] = [];
  const blocks = rawDiff.split(/(?=^diff --git )/m).filter((b) => b.trim());

  for (const block of blocks) {
    const firstLine = block.split('\n')[0] ?? '';
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(firstLine);
    if (!match) continue;

    const filename = match[2];
    if (SKIP_PATTERNS.some((p) => p.test(filename))) { skippedFiles.push(filename); continue; }

    const lines = block.split('\n');
    const changeType = detectChangeType(lines);
    const { cleanDiff, additions, deletions, contextLines } = cleanBlock(lines);
    if (!cleanDiff.trim()) continue;

    processedFiles.push({ filename, language: detectLanguage(filename), changeType, cleanDiff, additions, deletions, contextLines });
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

function cleanBlock(lines: string[]): { cleanDiff: string; additions: number; deletions: number; contextLines: number } {
  const clean: string[] = [];
  let additions = 0, deletions = 0, contextLines = 0, inHunk = false;

  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('old mode') ||
        line.startsWith('new mode') || line.startsWith('new file mode') || line.startsWith('deleted file mode') ||
        line.startsWith('rename from') || line.startsWith('rename to') || line.startsWith('similarity index') ||
        line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('\\ No newline')) continue;

    if (line.startsWith('@@')) { inHunk = true; clean.push(line); continue; }
    if (!inHunk) continue;

    if (line.startsWith('+'))      { additions++;    clean.push(line); }
    else if (line.startsWith('-')) { deletions++;    clean.push(line); }
    else                           { contextLines++; clean.push(line); }
  }
  return { cleanDiff: clean.join('\n'), additions, deletions, contextLines };
}

function buildChunks(files: ProcessedFile[], context: PRContext): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let current: ProcessedFile[] = [], currentChars = 0;

  const flush = (): void => {
    if (current.length === 0) return;
    chunks.push(buildChunk(current, chunks.length + 1, context));
    current = []; currentChars = 0;
  };

  for (const file of files) {
    const fc = file.cleanDiff.length;
    if (fc > MAX_CHUNK_CHARS) { flush(); chunks.push(buildChunk([truncate(file)], chunks.length + 1, context)); continue; }
    if (currentChars + fc > MAX_CHUNK_CHARS && current.length > 0) flush();
    current.push(file); currentChars += fc;
  }
  flush();

  const total = chunks.length;
  return chunks.map((c) => ({ ...c, totalChunks: total }));
}

function buildChunk(files: ProcessedFile[], chunkIndex: number, ctx: PRContext): DiffChunk {
  const fileList = files.map((f) => `  • ${f.filename} [${f.language}] ${f.changeType} +${f.additions}/-${f.deletions}`).join('\n');
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
  return { chunkIndex, totalChunks: 0, files, contextHeader, content, charCount: content.length };
}

function truncate(file: ProcessedFile): ProcessedFile {
  const lines = file.cleanDiff.split('\n');
  const out: string[] = [];
  let chars = 0;
  for (const l of lines) {
    if (chars + l.length > MAX_CHUNK_CHARS) break;
    out.push(l); chars += l.length + 1;
  }
  out.push('\n[... truncated — file too large ...]');
  return { ...file, cleanDiff: out.join('\n') };
}
