/**
 * @file src/services/ruleEngine.ts
 * @description Core service for applying repository-specific analysis rules.
 */

import { Repository } from '../models/Repository';
import { RepositoryRule, IRepositoryRuleSpec, ICustomPattern } from '../models/RepositoryRule';

interface CacheEntry {
  ruleSpec: IRepositoryRuleSpec;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Safe glob matcher — checks if `path` matches a simple glob pattern containing '*'.
 * Splits on '*' and verifies each literal segment appears in order.
 * This avoids dynamic RegExp construction and prevents ReDoS vulnerabilities.
 */
function matchesGlob(path: string, pattern: string): boolean {
  const segments = pattern.split('*');
  let remaining = path;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === '') continue; // leading/trailing/consecutive wildcards
    const idx = remaining.indexOf(seg);
    if (idx === -1) return false;
    // First segment must match at the start (anchored to '^')
    if (i === 0 && idx !== 0) return false;
    remaining = remaining.slice(idx + seg.length);
  }
  // Last segment must consume to the end (anchored to '$')
  const lastSeg = segments[segments.length - 1];
  if (lastSeg !== '' && remaining.length > 0) return false;
  return true;
}

/**
 * Checks if a path is allowed under the ignoredPaths configuration.
 * Returns true if the path is NOT ignored.
 */
export function isPathAllowed(path: string, ignoredPaths: string[]): boolean {
  if (!ignoredPaths || !Array.isArray(ignoredPaths)) return true;
  for (const p of ignoredPaths) {
    if (!p) continue;
    if (p.includes('*')) {
      if (matchesGlob(path, p)) return false;
    } else if (path.includes(p)) {
      return false;
    }
  }
  return true;
}

/**
 * Load active rule profile for a repository.
 * Order of priority:
 * 1. Active RepositoryRule named profile from DB
 * 2. Repository-level rules field
 * 3. Permissive default rules
 */
export async function loadActiveRule(repositoryFullName: string): Promise<IRepositoryRuleSpec> {
  const cached = cache.get(repositoryFullName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ruleSpec;
  }

  const defaultRule: IRepositoryRuleSpec = {
    strictMode: false,
    ignoreLinting: false,
    checkPerformance: true,
    minConfidence: 0.7,
    allowAutoApply: false,
    ignoredPaths: [],
    onlySecurity: false,
  };

  try {
    const repo = await Repository.findOne({ fullName: repositoryFullName });
    if (!repo) {
      cache.set(repositoryFullName, { ruleSpec: defaultRule, expiresAt: Date.now() + CACHE_TTL_MS });
      return defaultRule;
    }

    const activeRuleDoc = await RepositoryRule.findOne({
      repositoryId: repo._id,
      isActive: true,
    });

    let spec: IRepositoryRuleSpec;

    if (activeRuleDoc) {
      spec = activeRuleDoc.spec;
    } else {
      // Fallback to repository.rules if they exist, otherwise permissive defaults
      spec = {
        strictMode: repo.rules?.strictMode ?? defaultRule.strictMode,
        ignoreLinting: repo.rules?.ignoreLinting ?? defaultRule.ignoreLinting,
        checkPerformance: repo.rules?.checkPerformance ?? defaultRule.checkPerformance,
        minConfidence: repo.rules?.minConfidence ?? defaultRule.minConfidence,
        allowAutoApply: false,
        ignoredPaths: repo.ignorePatterns ?? [],
        onlySecurity: repo.reviewMode === 'security-only',
      };
    }

    cache.set(repositoryFullName, { ruleSpec: spec, expiresAt: Date.now() + CACHE_TTL_MS });
    return spec;
  } catch (error) {
    console.error(`Failed to load active rule for ${repositoryFullName}:`, error);
    return defaultRule;
  }
}

export interface RuleFilterResult {
  filteredFindings: any[];
  suppressedCount: number;
  suppressedReasons: {
    ignoredPath: number;
    lowConfidence: number;
    securityOnly: number;
    ignoreLinting: number;
    customSuppressed: number;
  };
}

/**
 * Helper to match a finding against a custom pattern specification.
 */
function matchesCustomPattern(finding: any, p: ICustomPattern): boolean {
  const textToMatch = `${finding.file || ''} ${finding.message || ''} ${finding.suggestion || ''}`;
  if (p.type === 'regex') {
    try {
      const regex = new RegExp(p.pattern, 'i');
      return regex.test(textToMatch);
    } catch {
      return false;
    }
  } else {
    return textToMatch.toLowerCase().includes(p.pattern.toLowerCase());
  }
}

/**
 * Filter a list of findings against a rule specification.
 */
export function filterFindings(findings: any[], spec: IRepositoryRuleSpec): RuleFilterResult {
  const filteredFindings: any[] = [];
  let ignoredPath = 0;
  let lowConfidence = 0;
  let securityOnly = 0;
  let ignoreLinting = 0;
  let customSuppressed = 0;

  const customPatterns = spec.customPatterns ?? [];
  const suppressPatterns = customPatterns.filter((p) => p.action === 'suppress');
  const flagPatterns = customPatterns.filter((p) => p.action === 'flag');

  for (const finding of findings) {
    // 1. Path check
    if (finding.file && !isPathAllowed(finding.file, spec.ignoredPaths)) {
      ignoredPath++;
      continue;
    }

    // 2. Only security
    if (spec.onlySecurity && finding.category && finding.category !== 'security') {
      securityOnly++;
      continue;
    }

    // 3. Confidence threshold
    if (typeof finding.confidence === 'number' && finding.confidence < spec.minConfidence) {
      lowConfidence++;
      continue;
    }

    // 4. Ignore linting
    if (spec.ignoreLinting && finding.category === 'code-quality') {
      ignoreLinting++;
      continue;
    }

    // 5. Custom suppress patterns
    let isCustomSuppressed = false;
    for (const sp of suppressPatterns) {
      if (matchesCustomPattern(finding, sp)) {
        isCustomSuppressed = true;
        break;
      }
    }
    if (isCustomSuppressed) {
      customSuppressed++;
      continue;
    }

    // 6. Custom flag patterns (upgrade or update finding details)
    const modifiedFinding = { ...finding };
    for (const fp of flagPatterns) {
      if (matchesCustomPattern(finding, fp)) {
        // Upgrade severity if custom pattern defines a higher one
        const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
        const findingSev = severityOrder[modifiedFinding.severity as keyof typeof severityOrder] ?? 0;
        const fpSev = severityOrder[fp.severity as keyof typeof severityOrder] ?? 0;
        if (fpSev > findingSev) {
          modifiedFinding.severity = fp.severity;
        }
        modifiedFinding.category = fp.category;
        modifiedFinding.message = `[${fp.category.toUpperCase()}] ${fp.message} - ${modifiedFinding.message}`;
      }
    }

    // Pass all checks
    filteredFindings.push(modifiedFinding);
  }

  return {
    filteredFindings,
    suppressedCount: ignoredPath + lowConfidence + securityOnly + ignoreLinting + customSuppressed,
    suppressedReasons: {
      ignoredPath,
      lowConfidence,
      securityOnly,
      ignoreLinting,
      customSuppressed,
    },
  };
}

/**
 * Scans raw pull request diff for custom forbidden patterns, generating findings.
 */
export function scanDiffForCustomPatterns(rawDiff: string, spec: IRepositoryRuleSpec): any[] {
  const findings: any[] = [];
  const customPatterns = spec.customPatterns ?? [];
  const flagPatterns = customPatterns.filter((p) => p.action === 'flag');

  if (flagPatterns.length === 0 || !rawDiff) {
    return findings;
  }

  const lines = rawDiff.split(/\r?\n/);
  let currentFile = '';
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      if (match) {
        currentFile = match[2];
      }
      continue;
    }

    if (line.startsWith('@@ ')) {
      const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        currentNewLine = parseInt(match[1], 10);
      }
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedContent = line.slice(1);

      if (currentFile && isPathAllowed(currentFile, spec.ignoredPaths ?? [])) {
        for (const p of flagPatterns) {
          let isMatch = false;
          if (p.type === 'regex') {
            try {
              const regex = new RegExp(p.pattern, 'i');
              isMatch = regex.test(addedContent);
            } catch {
              // ignore invalid regexes
            }
          } else {
            isMatch = addedContent.includes(p.pattern);
          }

          if (isMatch) {
            findings.push({
              file: currentFile,
              line: currentNewLine,
              severity: p.severity,
              category: p.category,
              message: p.message,
              suggestion: `Avoid using "${p.pattern}". Consider refactoring this code block.`,
              confidence: 1.0,
            });
          }
        }
      }
      currentNewLine++;
    } else if (!line.startsWith('-') && !line.startsWith('---') && !line.startsWith('index ')) {
      currentNewLine++;
    }
  }

  return findings;
}

/**
 * Clear in-memory rule cache (for testing or manually reloading rules).
 */
export function clearRuleCache(repositoryFullName?: string): void {
  if (repositoryFullName) {
    cache.delete(repositoryFullName);
  } else {
    cache.clear();
  }
}
