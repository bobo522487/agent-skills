#!/usr/bin/env node
'use strict';
// Deterministic review scope & complexity calculator for /review-router.
// Usage: node scripts/review-scope.mjs [--cwd <dir>] [--with-diff] [--max-diff-lines <N>]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasHeadCommit, parsePorcelainZ, runGit } from './lib/git-status.mjs';

const IGNORED_FILE_PATTERNS = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/,
  /\.min\.(js|css)$/i,
];

const ENV_EXAMPLE_PATTERN = /(^|\/)\.env\.(example|sample|template|dist)$/i;

const HIGH_RISK_RULES = [
  {
    category: 'DB 迁移',
    pattern: /(^|\/)(migrations?|prisma\/migrations|drizzle)\//i,
  },
  {
    category: 'DB 迁移',
    pattern: /\.sql$/i,
  },
  {
    category: '鉴权',
    pattern: /(^|[\/._-])(auth|oauth|jwt|rbac|acl|session|security|permissions?)([\/._-]|$)/i,
  },
  {
    category: '鉴权',
    // Case-sensitive camelCase match: catches useAuth.ts, authMiddleware.ts, AuthGuard.tsx without matching author.ts.
    pattern: /(^|[\/._-]|(?<=[a-z]))(auth|Auth|oauth|OAuth|jwt|JWT|rbac|RBAC|acl|ACL|session|Session|security|Security|permission|Permission|permissions|Permissions)($|[\/._-]|(?=[A-Z]))/,
  },
  {
    category: 'API 契约',
    pattern: /(^|[\/._-])(openapi|swagger|contracts?)([\/._-]|$)|\.(proto|graphql|gql)$/i,
  },
  {
    category: '密钥与 .git',
    pattern: /(^|\/)(\.env(\.|$)|\.git\/|secrets?\/)|\.(pem|key|p12|crt)$/i,
    exclude: ENV_EXAMPLE_PATTERN,
  },
  {
    category: 'CI 配置',
    pattern: /(^|\/)(\.github\/workflows\/|\.gitlab-ci\.yml|Jenkinsfile|\.circleci\/)/i,
  },
];

const MAX_UNTRACKED_BYTES = 512 * 1024;

export function isIgnoredFile(file) {
  if (!file) return false;
  const normalized = file.replace(/\\/g, '/');
  return IGNORED_FILE_PATTERNS.some((p) => p.test(normalized));
}

function splitLinesTrimTrailing(text) {
  if (!text) return [];
  const trimmed = text.replace(/\r?\n$/, '');
  if (!trimmed) return [];
  return trimmed.split(/\r?\n/);
}

function parseNumstat(stdout, ignoredSet) {
  let added = 0;
  let deleted = 0;
  for (const line of (stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const a = parts[0];
    const d = parts[1];
    const filePath = (parts[2] || '').replace(/\\/g, '/');
    if (filePath && (ignoredSet.has(filePath) || isIgnoredFile(filePath))) continue;
    if (a && a !== '-') added += Number.parseInt(a, 10) || 0;
    if (d && d !== '-') deleted += Number.parseInt(d, 10) || 0;
  }
  return { added, deleted };
}

function countUntrackedLines(ws, relPath) {
  try {
    const abs = path.join(ws, relPath);
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size > MAX_UNTRACKED_BYTES) return 0;
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) return 0;
    return splitLinesTrimTrailing(buf.toString('utf8')).length;
  } catch {
    return 0;
  }
}

function formatUntrackedDiff(ws, relPath) {
  try {
    const abs = path.join(ws, relPath);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return '';
    if (stat.size > MAX_UNTRACKED_BYTES) {
      return `diff --git a/${relPath} b/${relPath}\nnew file (skipped: >${MAX_UNTRACKED_BYTES} bytes)\n`;
    }
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) {
      return `diff --git a/${relPath} b/${relPath}\nBinary file ${relPath} added\n`;
    }
    const lines = splitLinesTrimTrailing(buf.toString('utf8'));
    const body = lines.map((l) => `+${l}`).join('\n');
    return `diff --git a/${relPath} b/${relPath}\nnew file\n--- /dev/null\n+++ b/${relPath}\n@@ -0,0 +1,${lines.length} @@\n${body}\n`;
  } catch {
    return '';
  }
}

function splitGitDiffByFile(rawDiff) {
  const sections = [];
  if (!rawDiff || !rawDiff.trim()) return sections;
  const parts = rawDiff.split(/(?=^diff --git )/m);
  for (const part of parts) {
    const trimmed = part.trimEnd();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    const file = headerMatch ? headerMatch[2].replace(/^"|"$/g, '').replace(/\\/g, '/') : '';
    sections.push({ file, text: trimmed });
  }
  return sections;
}

function allocateDiffBudget(fileDiffs, highRiskFileSet, maxDiffLines) {
  const priorityRank = (file) => {
    if (highRiskFileSet.has(file)) return 0;
    if (!file.startsWith('docs/') && !/\.(md|txt)$/i.test(file)) return 1;
    return 2;
  };

  const ordered = [...fileDiffs].sort((a, b) => {
    const rankDiff = priorityRank(a.file) - priorityRank(b.file);
    return rankDiff !== 0 ? rankDiff : a.file.localeCompare(b.file);
  });

  const lineArrays = ordered.map((d) => ({
    file: d.file,
    lines: d.text.split(/\r?\n/),
  }));

  const totalLines = lineArrays.reduce((sum, item) => sum + item.lines.length, 0);
  if (totalLines <= maxDiffLines) {
    return {
      diff: ordered.map((d) => d.text).join('\n').trim(),
      diffTruncated: false,
      diffTotalLines: totalLines,
    };
  }

  // Fair per-file budget: guarantee every changed file gets represented (high-risk & code first).
  const count = lineArrays.length;
  const allocations = new Array(count).fill(0);
  let remaining = maxDiffLines;

  const baseShare = Math.max(12, Math.floor(maxDiffLines / count));
  for (let i = 0; i < count; i += 1) {
    const want = Math.min(lineArrays[i].lines.length, baseShare, remaining);
    allocations[i] = want;
    remaining -= want;
  }

  for (let i = 0; i < count && remaining > 0; i += 1) {
    const extraNeed = lineArrays[i].lines.length - allocations[i];
    if (extraNeed > 0) {
      const give = Math.min(extraNeed, remaining);
      allocations[i] += give;
      remaining -= give;
    }
  }

  const outChunks = [];
  for (let i = 0; i < count; i += 1) {
    const { lines } = lineArrays[i];
    const take = allocations[i];
    if (take <= 0) {
      outChunks.push(`diff --git a/${lineArrays[i].file} b/${lineArrays[i].file}\n... [omitted ${lines.length} lines due to diff budget]`);
    } else if (take < lines.length) {
      outChunks.push(`${lines.slice(0, take).join('\n')}\n... [truncated ${lines.length - take} lines in ${lineArrays[i].file}]`);
    } else {
      outChunks.push(lines.join('\n'));
    }
  }

  return {
    diff: outChunks.join('\n').trim(),
    diffTruncated: true,
    diffTotalLines: totalLines,
  };
}

export function matchHighRisk(files) {
  const hits = [];
  const seen = new Set();
  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    for (const rule of HIGH_RISK_RULES) {
      if (rule.exclude && rule.exclude.test(normalized)) continue;
      if (rule.pattern.test(normalized)) {
        const key = `${rule.category}:${normalized}`;
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({ category: rule.category, file: normalized });
        }
        break;
      }
    }
  }
  return hits;
}

export function computeReviewScope(ws, { withDiff = false, maxDiffLines = 600 } = {}) {
  const statusRes = runGit(ws, ['status', '--porcelain=v1', '-z', '-uall']);
  if (statusRes.error || statusRes.status !== 0) {
    return { error: 'Not a git repository or git unavailable' };
  }

  const entries = parsePorcelainZ(statusRes.stdout || '');
  const changedFilesSet = new Set();
  const riskCheckSet = new Set();
  const ignoredSet = new Set();
  const untrackedFiles = [];

  for (const e of entries) {
    if (!e.file) continue;
    if (isIgnoredFile(e.file)) {
      ignoredSet.add(e.file);
      continue;
    }
    // Count a rename once (using destination path), while checking both paths for high-risk.
    changedFilesSet.add(e.file);
    riskCheckSet.add(e.file);
    if (e.origFile && !isIgnoredFile(e.origFile)) {
      riskCheckSet.add(e.origFile);
    }
    if (e.untracked) untrackedFiles.push(e.file);
  }

  const changedFiles = Array.from(changedFilesSet).sort();
  const ignoredFiles = Array.from(ignoredSet).sort();
  const headExists = hasHeadCommit(ws);

  let added = 0;
  let deleted = 0;
  if (headExists) {
    const stat = parseNumstat(runGit(ws, ['diff', '--numstat', 'HEAD']).stdout, ignoredSet);
    added += stat.added;
    deleted += stat.deleted;
  } else {
    const staged = parseNumstat(runGit(ws, ['diff', '--numstat', '--cached']).stdout, ignoredSet);
    const unstaged = parseNumstat(runGit(ws, ['diff', '--numstat']).stdout, ignoredSet);
    added += staged.added + unstaged.added;
    deleted += staged.deleted + unstaged.deleted;
  }

  for (const uf of untrackedFiles) {
    added += countUntrackedLines(ws, uf);
  }

  const totalChangedLines = added + deleted;
  const highRiskHits = matchHighRisk(Array.from(riskCheckSet).sort());

  const fileScore = Math.max(0, changedFiles.length - 1);
  const lineScore = totalChangedLines > 0 ? Math.ceil(totalChangedLines / 100) : 0;
  const riskScore = highRiskHits.length * 3;
  const complexity = Math.min(10, fileScore + lineScore + riskScore);

  let route = 'dual-axis';
  if (complexity <= 3 && highRiskHits.length === 0) {
    route = 'single-axis';
  } else if (complexity >= 7 || highRiskHits.length > 0) {
    route = 'dual-axis-high-risk';
  }

  const summary = {
    headExists,
    fileCount: changedFiles.length,
    changedFiles,
    ignoredFiles,
    untrackedFiles,
    addedLines: added,
    deletedLines: deleted,
    totalChangedLines,
    highRiskHits,
    scoreBreakdown: { fileScore, lineScore, riskScore },
    complexity,
    route,
  };

  if (!withDiff) return summary;

  const fileDiffs = [];
  if (headExists) {
    const raw = runGit(ws, ['diff', 'HEAD']).stdout || '';
    for (const sec of splitGitDiffByFile(raw)) {
      if (sec.file && (ignoredSet.has(sec.file) || isIgnoredFile(sec.file))) continue;
      fileDiffs.push(sec);
    }
  } else {
    const raw1 = runGit(ws, ['diff', '--cached']).stdout || '';
    const raw2 = runGit(ws, ['diff']).stdout || '';
    for (const sec of [...splitGitDiffByFile(raw1), ...splitGitDiffByFile(raw2)]) {
      if (sec.file && (ignoredSet.has(sec.file) || isIgnoredFile(sec.file))) continue;
      fileDiffs.push(sec);
    }
  }
  for (const uf of untrackedFiles) {
    const ud = formatUntrackedDiff(ws, uf);
    if (ud) fileDiffs.push({ file: uf, text: ud.trimEnd() });
  }

  const highRiskFileSet = new Set(highRiskHits.map((h) => h.file));
  const budgeted = allocateDiffBudget(fileDiffs, highRiskFileSet, maxDiffLines);
  summary.diffTruncated = budgeted.diffTruncated;
  summary.diffTotalLines = budgeted.diffTotalLines;
  summary.diff = budgeted.diff;

  return summary;
}

function parseArgs(argv) {
  let cwd = process.cwd();
  let withDiff = false;
  let maxDiffLines = 600;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--with-diff') {
      withDiff = true;
    } else if (arg === '--cwd' && argv[i + 1]) {
      cwd = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--max-diff-lines' && argv[i + 1]) {
      maxDiffLines = Math.max(50, Number.parseInt(argv[i + 1], 10) || 600);
      i += 1;
    }
  }
  return { cwd, withDiff, maxDiffLines };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const result = computeReviewScope(opts.cwd, opts);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.error) process.exit(1);
}
