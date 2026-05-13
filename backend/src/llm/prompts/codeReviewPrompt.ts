/**
 * @file src/llm/prompts/codeReviewPrompt.ts
 * @description Advanced prompt engineering for AI code review.
 *
 * Design principles:
 * - Role-first: establish expert identity before task
 * - Strict JSON schema: reduce hallucination with exact output shape
 * - OWASP Top 10 coverage: explicit security checklist
 * - Severity anchoring: concrete examples prevent drift
 * - Negative examples: tell LLM what NOT to flag
 * - Confidence gating: self-assessed certainty filters noise
 */

import { PRContext } from '../../types/analysis';
import { DiffChunk } from '../parsers/reviewParser';

/** The exact JSON schema the LLM must return */
export const REVIEW_JSON_SCHEMA = `{
  "reviewId": "string — pass through the reviewId from context",
  "severity": "Critical|High|Medium|Low",
  "confidence": number (0-100),
  "issues": [
    {
      "file": "string — exact file path from the diff",
      "lineStart": number | null,
      "lineEnd": number | null,
      "type": "bug|security|performance|refactor|test",
      "description": "string — clear explanation of the problem and its impact",
      "suggestion": "string — specific actionable fix",
      "fixCode": "string | null — corrected code block if applicable"
    }
  ],
  "summary": "string — 2-4 sentence narrative of what this PR does and key concerns",
  "suggestedTests": ["string"] 
}`;

const SEVERITY_GUIDE = `
SEVERITY (pick ONE overall rating for this PR):
- Critical: Exploitable security vulnerability, data corruption risk, auth bypass
- High:     Logic bug with visible user impact, SQL/XSS risk, unhandled crash path  
- Medium:   Performance issue in hot path, missing input validation, poor error handling
- Low:      Code smell, missing null check (non-critical), unclear naming
`.trim();

const OWASP_GUIDE = `
SECURITY CHECKS — apply OWASP Top 10 to every file:
A01 Broken Access Control: IDOR, missing auth checks, path traversal
A02 Cryptographic Failures: MD5/SHA1 hashing, plaintext secrets, no TLS enforcement
A03 Injection: SQL/NoSQL/command injection, XSS, template injection
A04 Insecure Design: No rate limiting, missing input validation architecture
A05 Security Misconfiguration: Debug mode, default credentials, permissive CORS
A06 Vulnerable Components: Recognizable CVE-affected package versions
A07 Auth Failures: Broken session, weak JWT, no expiry, token in URL
A08 Integrity Failures: No HMAC verification, unsafe deserialization
A09 Logging Failures: Logging secrets/PII, missing audit trail for auth events
A10 SSRF: Unvalidated URLs used in server-side HTTP requests
`.trim();

const CONFIDENCE_GUIDE = `
CONFIDENCE (0-100 — your self-assessed certainty):
90-100: Definitive bug or vulnerability — you can trace the exact failure path
70-89:  Likely issue — code pattern strongly suggests a problem
50-69:  Possible issue — worth flagging but context may resolve it
0-49:   Skip it — don't include findings below 50 confidence
`.trim();

const RULES = `
RULES:
1. Only flag code in ADDED lines (starting with '+') — never flag removed lines ('-')
2. Do not flag style-only issues (quote style, spacing, indentation)
3. Do not flag test files for lacking production-style error handling
4. Respond with ONLY the JSON object — no markdown fences, no preamble
5. fixCode must be actual corrected code, not pseudocode or placeholders
6. If no issues found, return empty issues array with high confidence score
`.trim();

/**
 * Builds the system prompt — sets the LLM's role and behaviour rules.
 */
export function buildSystemPrompt(language: string | null): string {
  const langHint = language
    ? `Primary language: ${language}. Apply ${language}-specific best practices and idioms.`
    : 'This PR contains multiple languages — apply best practices per file type.';

  return `You are GitGuard AI — a senior software engineer and security researcher with 15+ years of experience in code review, security auditing, and performance engineering. You are thorough, precise, and only flag real issues.

${langHint}

You review git diffs and return structured JSON code review findings. You check for:
1. Bugs — logic errors, null pointer risks, race conditions, off-by-one errors
2. Security — OWASP Top 10 vulnerabilities (see instructions in user message)
3. Performance — N+1 queries, blocking I/O, inefficient algorithms, memory leaks
4. Code quality — poor naming, missing error handling, duplication, dead code

${RULES}`;
}

/**
 * Builds the user prompt for a diff chunk.
 * Injects the chunk content, PR context, and full review instructions.
 */
export function buildUserPrompt(
  chunk: DiffChunk,
  context: PRContext,
  reviewId: string,
): string {
  const chunkNote = chunk.totalChunks > 1
    ? `\nNOTE: Reviewing chunk ${chunk.chunkIndex}/${chunk.totalChunks}. Focus only on the files in this chunk.`
    : '';

  return `Review the following pull request diff. Return ONLY a valid JSON object.

REVIEW CONTEXT:
reviewId: ${reviewId}
Repository: ${context.repositoryFullName}
PR #${context.prNumber}: ${context.title}
Author: @${context.authorLogin}
Branch: ${context.headBranch} → ${context.baseBranch}
Language: ${context.language ?? 'Mixed'}
Size: ${context.changedFiles} files, +${context.additions}/-${context.deletions} lines
Description: ${context.description ? context.description.slice(0, 400) : 'No description provided.'}
${chunkNote}

${SEVERITY_GUIDE}

${OWASP_GUIDE}

${CONFIDENCE_GUIDE}

REQUIRED JSON OUTPUT SCHEMA (respond with this exact structure):
${REVIEW_JSON_SCHEMA}

DIFF TO REVIEW:
${chunk.content}

Respond with valid JSON only. No markdown. No explanation outside JSON.`;
}

/**
 * Builds the retry prompt — adds a strict reminder when parsing fails.
 */
export function buildRetryPrompt(originalUserPrompt: string, parseError: string): string {
  return `${originalUserPrompt}

CRITICAL: Your previous response could not be parsed as valid JSON.
Parse error: ${parseError}
You MUST respond with ONLY the JSON object. No text before or after. No markdown code fences. Start your response with { and end with }.`;
}
