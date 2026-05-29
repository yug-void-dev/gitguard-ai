/**
 * @file src/utils/diffFormatter.ts
 * @description Diff formatting utilities for:
 *   1. Side-by-side diff preparation for frontend (Week 3 & 4)
 *   2. Rich Markdown comment formatting (Week 3)
 *   3. Hunk-level diff reconstruction with findings overlaid
 *
 * Used by:
 *   - commentService.ts → post comments with formatted diffs
 *   - reviewController.ts → API responses with side-by-side diffs
 *   - Frontend ReviewDetailPage → render diffs with line highlights
 *
 * Pipeline: ProcessedDiff + IFinding[] → SideBySideDiff + MarkdownComment
 */

import { IFinding } from '../models/Review';
import { ProcessedFile } from '../github/diffProcessor'; // DiffChunk, ProcessedDiff intentionally omitted — not used in this module
import { PRContext } from '../types/analysis';
import { logger } from '../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Represents a single line in a diff hunk */
export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  lineNumber?: number;          // Line number in new file
  oldLineNumber?: number;        // Line number in old file
  content: string;               // Raw line content without +/-
  hasFinding?: boolean;          // True if a finding is attached to this line
  findingIds?: string[];         // ObjectIds of findings on this line
}

/** Represents a code hunk (contiguous diff block) */
export interface DiffHunk {
  filename: string;
  oldStartLine: number;
  oldLineCount: number;
  newStartLine: number;
  newLineCount: number;
  lines: DiffLine[];
  findings: IFinding[];          // Findings specific to this hunk
}

/** Side-by-side diff representation for frontend */
export interface SideBySideDiff {
  filename: string;
  language: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  summary: {
    additions: number;
    deletions: number;
    findingsCount: number;
  };
}

/** Repository-wide diff collection */
export interface FormattedDiffCollection {
  files: SideBySideDiff[];
  totalFindingsCount: number;
  totalAdditions: number;
  totalDeletions: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/** Markdown comment structure */
export interface MarkdownCommentBlock {
  type: 'summary' | 'file-findings' | 'file-no-issues' | 'suggestion' | 'footer';
  content: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  filename?: string;
}

export interface MarkdownComment {
  title: string;
  blocks: MarkdownCommentBlock[];
  fullMarkdown: string;
  findingsCount: number;
  criticalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts raw diff + findings into side-by-side format for frontend.
 * Used by reviewController.ts to return review details with visual diffs.
 *
 * @param rawDiff Raw unified diff from Octokit
 * @param findings LLM analysis findings
 * @param context PR context for language detection
 * @param eventId Trace ID
 * @returns Formatted diffs organized by file
 */
export function formatDiffForFrontend(
  rawDiff: string,
  findings: IFinding[],
  _context: PRContext,
  eventId: string,
): FormattedDiffCollection {
  const log = logger.child({ module: 'diffFormatter.formatDiffForFrontend', eventId });
  log.debug('Formatting diff for frontend display');

  const files = parseDiffIntoFiles(rawDiff);
  const formattedFiles: SideBySideDiff[] = [];

  for (const file of files) {
    const fileFindings = findings.filter((f) => f.file === file.filename);
    const hunks = parseHunks(file.cleanDiff, fileFindings);

    formattedFiles.push({
      filename: file.filename,
      language: file.language,
      changeType: file.changeType,
      hunks,
      summary: {
        additions: file.additions,
        deletions: file.deletions,
        findingsCount: fileFindings.length,
      },
    });
  }

  // Aggregate statistics
  const allFindings = findings;
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount = allFindings.filter((f) => f.severity === 'high').length;
  const mediumCount = allFindings.filter((f) => f.severity === 'medium').length;
  const lowCount = allFindings.filter((f) => f.severity === 'low').length;

  log.info({
    filesCount: formattedFiles.length,
    findingsCount: allFindings.length,
    critical: criticalCount,
    high: highCount,
  }, 'Diff formatted for frontend');

  return {
    files: formattedFiles,
    totalFindingsCount: allFindings.length,
    totalAdditions: files.reduce((s, f) => s + f.additions, 0),
    totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Converts LLM findings into rich Markdown for GitHub PR comment.
 * Used by commentService.ts to post comments on GitHub.
 *
 * @param findings LLM analysis findings sorted by severity
 * @param context PR context with title/description
 * @param metrics Code quality metrics
 * @param eventId Trace ID
 * @returns Structured Markdown comment ready to post
 */
export function formatFindingsAsMarkdown(
  findings: IFinding[],
  context: PRContext,
  metrics: {
    codeQualityScore: number;
    vulnerabilitiesCount: number;
    performanceIssuesCount: number;
  },
  eventId: string,
): MarkdownComment {
  const log = logger.child({ module: 'diffFormatter.formatFindingsAsMarkdown', eventId });

  const blocks: MarkdownCommentBlock[] = [];

  // ─── Progress Bar Helper ──────────────────────────────────────────────────
  const buildProgressBar = (score: number): string => {
    const totalBlocks = 15;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return `[\`${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}\`]`;
  };

  // ─── Summary Block ────────────────────────────────────────────────────────
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;

  let grade = 'F';
  let gradeColor = '🔴';
  if (metrics.codeQualityScore >= 90) { grade = 'A'; gradeColor = '🟢'; }
  else if (metrics.codeQualityScore >= 80) { grade = 'B'; gradeColor = '🟢'; }
  else if (metrics.codeQualityScore >= 70) { grade = 'C'; gradeColor = '🟡'; }
  else if (metrics.codeQualityScore >= 60) { grade = 'D'; gradeColor = '🟠'; }

  const summaryMarkdown = `## ${gradeColor} GitGuard AI Code Review — Grade ${grade}

### 📊 Code Quality Dashboard

| Metric | Status | Rating / Details |
| :--- | :--- | :--- |
| **Code Quality Score** | ${metrics.codeQualityScore >= 80 ? '✅ Healthy' : '⚠️ Attention Needed'} | \`${metrics.codeQualityScore}%\` |
| **Overall Rating** | **Grade ${grade}** | ${buildProgressBar(metrics.codeQualityScore)} |
| **Vulnerabilities** | ${metrics.vulnerabilitiesCount === 0 ? '🛡️ Safe' : '🚨 Critical Action'} | \`${metrics.vulnerabilitiesCount} detected\` |
| **Performance Issues** | ${metrics.performanceIssuesCount === 0 ? '⚡ Optimized' : '🐢 Slowdowns'} | \`${metrics.performanceIssuesCount} found\` |

---

### 🔍 Review Overview
- **PR Details:** #${context.prNumber} — **${context.title}**
- **Branch Flow:** \`${context.headBranch}\` ➔ \`${context.baseBranch}\`
- **Total Findings:** \`${findings.length}\` | **Critical:** \`${criticalCount}\` | **High:** \`${highCount}\` | **Medium:** \`${mediumCount}\` | **Low/Info:** \`${findings.filter((f) => f.severity === 'low' || f.severity === 'info').length}\`
- **Reviewed By:** GitGuard AI Bot (Trace ID: \`${eventId}\`)

---
`;

  blocks.push({
    type: 'summary',
    content: summaryMarkdown,
  });

  // ─── Group Findings by File ────────────────────────────────────────────────
  const fileGroups = new Map<string, IFinding[]>();
  for (const finding of findings) {
    if (!fileGroups.has(finding.file)) fileGroups.set(finding.file, []);
    fileGroups.get(finding.file)!.push(finding);
  }

  // ─── File-level Findings ──────────────────────────────────────────────────
  for (const [filename, fileFinding] of fileGroups) {
    const sorted = fileFinding.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const fileBlock = buildFileBlock(filename, sorted);
    blocks.push(fileBlock);
  }

  // ─── Footer Block ─────────────────────────────────────────────────────────
  const footerMarkdown = `
---

### ✨ About GitGuard AI
This review was generated by **GitGuard AI** using advanced LLM analysis (Gemini 1.5 Flash / Groq Llama 3).
- 🚀 [View Dashboard](https://gitguard.local/dashboard)
- 📖 [Documentation](https://docs.gitguard.local)
- 💬 [Provide Feedback](https://github.com/gitguard-ai/feedback)

**Pro Tip:** Enable \`one-click suggestion apply\` in your repository settings to auto-commit fixes!
`;

  blocks.push({
    type: 'footer',
    content: footerMarkdown,
  });

  // ─── Assemble Full Markdown ───────────────────────────────────────────────
  const fullMarkdown = blocks.map((b) => b.content).join('\n');

  log.info({
    blockCount: blocks.length,
    findingsCount: findings.length,
    criticalCount,
    highCount,
  }, 'Findings formatted as Markdown');

  return {
    title: `🤖 GitGuard AI Review — PR #${context.prNumber}`,
    blocks,
    fullMarkdown,
    findingsCount: findings.length,
    criticalCount,
  };
}

/**
 * Extracts just the critical/high findings for inline GitHub review comments.
 * Used by commentService.ts for per-file inline comments.
 *
 * @param findings All findings
 * @param filename Target filename
 * @returns Critical & high findings for this file
 */
export function getInlineFindingsForFile(
  findings: IFinding[],
  filename: string,
): IFinding[] {
  return findings
    .filter((f) => f.file === filename && (f.severity === 'critical' || f.severity === 'high'))
    .sort((a, b) => a.line - b.line);
}

/**
 * Formats a single finding for inline GitHub comment (on specific line).
 * @param finding The finding to format
 * @returns Markdown string for inline comment
 */
export function formatInlineComment(finding: IFinding): string {
  const emoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
    info: '🔵',
  }[finding.severity] ?? '❓';

  return `
${emoji} **${finding.severity.toUpperCase()}** | Confidence: ${Math.round(finding.confidence * 100)}%

**Issue:** ${finding.message}

\`\`\`suggestion
${finding.suggestion}
\`\`\`
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse unified diff string into individual files with metadata.
 * @param rawDiff Raw diff from Octokit
 * @returns Array of ProcessedFile structures
 */
function parseDiffIntoFiles(rawDiff: string): ProcessedFile[] {
  const files: ProcessedFile[] = [];
  const blocks = rawDiff.split(/(?=^diff --git )/m).filter((b) => b.trim());
  const langMap: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin',
    swift: 'Swift', cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP', sql: 'SQL',
    sh: 'Shell', bash: 'Shell', yaml: 'YAML', yml: 'YAML', json: 'JSON',
    html: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue', svelte: 'Svelte',
  };

  for (const block of blocks) {
    const firstLine = block.split('\n')[0] ?? '';
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(firstLine);
    if (!match) continue;

    const filename = match[2];
    const lines = block.split('\n');
    const changeType = detectChangeType(lines);

    // Count additions/deletions
    let additions = 0, deletions = 0;
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const language = langMap[ext] ?? 'Unknown';

    files.push({
      filename,
      language,
      changeType,
      cleanDiff: block,
      additions,
      deletions,
      contextLines: 0,
    });
  }

  return files;
}

/**
 * Detect change type from diff block lines.
 */
function detectChangeType(
  lines: string[],
): 'added' | 'modified' | 'deleted' | 'renamed' {
  if (lines.some((l) => l.startsWith('new file mode'))) return 'added';
  if (lines.some((l) => l.startsWith('deleted file mode'))) return 'deleted';
  if (lines.some((l) => l.startsWith('rename from'))) return 'renamed';
  return 'modified';
}

/**
 * Parse hunks from a file's diff block and attach findings.
 */
function parseHunks(fileDiff: string, findings: IFinding[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const hunkMatches = Array.from(fileDiff.matchAll(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g));

  for (let i = 0; i < hunkMatches.length; i++) {
    const match = hunkMatches[i];
    const hunkStart = match.index ?? 0;
    const hunkEnd = (hunkMatches[i + 1]?.index ?? fileDiff.length) - 1;

    const oldStartLine = parseInt(match[1], 10);
    const oldLineCount = parseInt(match[2] ?? '1', 10);
    const newStartLine = parseInt(match[3], 10);
    const newLineCount = parseInt(match[4] ?? '1', 10);

    const hunkContent = fileDiff.slice(hunkStart, hunkEnd);
    const hunkLines = hunkContent.split('\n');

    const diffLines: DiffLine[] = [];
    let currentNewLine = newStartLine;
    let currentOldLine = oldStartLine;

    for (const line of hunkLines) {
      if (line.startsWith('@@')) continue;
      if (line.startsWith('\\')) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.slice(1);
        const lineFinding = findings.find((f) => f.line === currentNewLine);
        diffLines.push({
          type: 'addition',
          lineNumber: currentNewLine,
          content,
          hasFinding: !!lineFinding,
          findingIds: lineFinding ? [lineFinding.file] : undefined,
        });
        currentNewLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const content = line.slice(1);
        diffLines.push({
          type: 'deletion',
          oldLineNumber: currentOldLine,
          content,
        });
        currentOldLine++;
      } else if (!line.startsWith('diff ') && !line.startsWith('index ')) {
        const content = line.startsWith(' ') ? line.slice(1) : line;
        diffLines.push({
          type: 'context',
          lineNumber: currentNewLine,
          oldLineNumber: currentOldLine,
          content,
        });
        currentNewLine++;
        currentOldLine++;
      }
    }

    if (diffLines.length > 0) {
      hunks.push({
        filename: '',
        oldStartLine,
        oldLineCount,
        newStartLine,
        newLineCount,
        lines: diffLines,
        findings: findings.filter((f) => f.line >= newStartLine && f.line < newStartLine + newLineCount),
      });
    }
  }

  return hunks;
}

function buildFileBlock(filename: string, findings: IFinding[]): MarkdownCommentBlock {
  let markdown = `### 📄 \`${filename}\`\n\n`;

  for (const finding of findings) {
    const alertHeader = {
      critical: '> [!CAUTION]\n> ### 🚨 CRITICAL FINDING',
      high: '> [!WARNING]\n> ### ⚠️ HIGH SEVERITY FINDING',
      medium: '> [!IMPORTANT]\n> ### 💡 MEDIUM SEVERITY FINDING',
      low: '> [!NOTE]\n> ### ℹ️ LOW SEVERITY FINDING',
      info: '> [!NOTE]\n> ### ℹ️ INFO FINDING',
    }[finding.severity] ?? '> [!NOTE]';

    markdown += `${alertHeader}\n`;
    markdown += `> **Line ${finding.line}** | Confidence: **${Math.round(finding.confidence * 100)}%**\n`;
    markdown += `> \n`;
    markdown += `> ${finding.message}\n\n`;

    if (finding.suggestion) {
      markdown += `#### 💡 Suggested Fix:\n`;
      markdown += `\`\`\`suggestion\n`;
      markdown += `${finding.suggestion}\n`;
      markdown += `\`\`\`\n\n`;
    }
  }

  return {
    type: 'file-findings',
    content: markdown,
    filename,
    severity: findings[0]?.severity,
  };
}
