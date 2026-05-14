/**
 * @file src/llm/prompts/codeReviewPrompt.ts
 * @description Advanced prompt engineering for AI code review.
 */

import { PRContext } from '../../types/analysis';
import { DiffChunk } from '../parsers/reviewParser';

export const REVIEW_JSON_SCHEMA = `{
  "reviewId": "string",
  "severity": "Critical|High|Medium|Low",
  "confidence": number (0-100),
  "issues": [
    {
      "file": "string",
      "lineStart": number | null,
      "lineEnd": number | null,
      "type": "bug|security|performance|refactor|test",
      "description": "string",
      "suggestion": "string",
      "fixCode": "string | null"
    }
  ],
  "summary": "string",
  "suggestedTests": ["string"]
}`;

const SEVERITY_GUIDE = `SEVERITY (one overall rating):
- Critical: Exploitable security vulnerability, auth bypass, data loss risk
- High: Logic bug with user impact, SQL/XSS risk, unhandled crash path
- Medium: Performance issue in hot path, missing input validation
- Low: Code smell, unclear naming, minor missing null check`;

const OWASP_GUIDE = `OWASP TOP 10 CHECKS:
A01 Broken Access Control | A02 Cryptographic Failures | A03 Injection
A04 Insecure Design | A05 Security Misconfiguration | A06 Vulnerable Components
A07 Auth Failures | A08 Integrity Failures | A09 Logging Failures | A10 SSRF`;

export function buildSystemPrompt(language: string | null): string {
  const langHint = language
    ? `Primary language: ${language}. Apply ${language}-specific best practices.`
    : 'This PR contains multiple languages — apply best practices per file type.';

  return `You are GitGuard AI — a senior software engineer and security researcher with 15+ years of experience in code review, security auditing, and performance engineering.

${langHint}

Review git diffs and return structured JSON findings. Check for:
1. Bugs — logic errors, null pointer risks, race conditions
2. Security — OWASP Top 10 vulnerabilities
3. Performance — N+1 queries, blocking I/O, memory leaks
4. Code quality — poor naming, missing error handling, duplication

CRITICAL RULES:
- Respond with ONLY valid JSON — no markdown, no preamble
- Only flag issues in ADDED lines (starting with '+'), never removed lines ('-')
- Confidence > 90: certain; 70-89: likely; 50-69: possible; < 50: skip
- fixCode must be real corrected code, not pseudocode`;
}

export function buildUserPrompt(chunk: DiffChunk, context: PRContext, reviewId: string): string {
  const chunkNote = chunk.totalChunks > 1
    ? `\nNOTE: Reviewing chunk ${chunk.chunkIndex}/${chunk.totalChunks}. Focus only on files in this chunk.`
    : '';

  return `Review the following pull request diff. Return ONLY a valid JSON object.

CONTEXT:
reviewId: ${reviewId}
Repository: ${context.repositoryFullName}
PR #${context.prNumber}: ${context.title}
Author: @${context.authorLogin} | Branch: ${context.headBranch} → ${context.baseBranch}
Language: ${context.language ?? 'Mixed'} | Size: ${context.changedFiles} files, +${context.additions}/-${context.deletions}
Description: ${context.description ? context.description.slice(0, 400) : 'No description provided.'}
${chunkNote}

${SEVERITY_GUIDE}

${OWASP_GUIDE}

REQUIRED JSON SCHEMA:
${REVIEW_JSON_SCHEMA}

DIFF:
${chunk.content}

Respond with valid JSON only. No markdown. No explanation outside JSON.`;
}

export function buildRetryPrompt(originalUserPrompt: string, parseError: string): string {
  return `${originalUserPrompt}

CRITICAL: Your previous response could not be parsed as valid JSON.
Error: ${parseError}
Respond with ONLY the JSON object. Start with { and end with }. No markdown fences.`;
}
