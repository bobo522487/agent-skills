#!/usr/bin/env node
'use strict';
// Deterministic review scope & complexity calculator for /review-router.
// Usage: node scripts/review-scope.mjs [--cwd <dir>] [--with-diff] [--max-diff-lines <N>]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    pattern: /(^|\/)(auth|oauth|jwt|rbac|acl|session|security|permissions?)(\/|\.)/i,
  },
  {
    category: 'API 契约',
    pattern: /(^|\/)(openapi|swagger|proto|contracts?)(\/|\.)|schema\.graphql$/i,
  },
  {
    category: '密钥与 .git',
    pattern: /(^|\/)(\.env(\.|$)|\.git\/|secrets?\/)|\.(pem|key|p12|crt)$/i,
  },
  {
    category: 'CI 配置',
    pattern: /(^|\/)(\.github\/workflows\/|\.gitlab-ci\.yml|Jenkinsfile|\.circleci\/)/i,
  },
];

const MAX_UNTRACKED_BYTES = 512 * 1024;

function runGit(ws, args) {
  return spawnSync('git', args, {
    cwd: ws,
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function hasHeadCommit(ws) {
  const res = runGit(ws, ['rev-parse', '--verify', 'HEAD']);
  return !res.error && res.status === 0;
}

function parseStatusZ(raw) {
  const entries = [];
  if (!raw) return entries;
  const tokens = raw.split('\0');
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || token.length < 4) continue;
    const xy = token.slice(0, 2);
    const file = token.slice(3);
    let origFile = '';
    if (xy.includes('R') || xy.includes('C')) {
      origFile = tokens[i + 1] || '';
      i += 1;
    }
    entries.push({ xy, file, origFile, untracked: xy === '??' });
  }
  return entries;
}

function parseNumstat(stdout) {
  let added = 0;
  let deleted = 0;
  for (const line of (stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [a, d] = line.split('\t');
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
    // Skip binary files containing NUL bytes
    if (buf.includes(0)) return 0;
    const text = buf.toString('utf8');
    if (!text) return 0;
    return text.split(/\r?\n/).length;
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
    const lines = buf.toString('utf8').split(/\r?\n/);
    const body = lines.map((l) => `+${l}`).join('\n');
    return `diff --git a/${relPath} b/${relPath}\nnew file\n--- /dev/null\n+++ b/${relPath}\n@@ -0,0 +1,${lines.length} @@\n${body}\n`;
  } catch {
    return '';
  }
}

export function matchHighRisk(files) {
  const hits = [];
  const seen = new Set();
  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    for (const rule of HIGH_RISK_RULES) {
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

  const entries = parseStatusZ(statusRes.stdout || '');
  const changedFilesSet = new Set();
  const untrackedFiles = [];

  for (const e of entries) {
    if (e.file) changedFilesSet.add(e.file);
    if (e.origFile) changedFilesSet.add(e.origFile);
    if (e.untracked && e.file) untrackedFiles.push(e.file);
  }

  const changedFiles = Array.from(changedFilesSet).sort();
  const headExists = hasHeadCommit(ws);

  let added = 0;
  let deleted = 0;
  if (headExists) {
    const stat = parseNumstat(runGit(ws, ['diff', '--numstat', 'HEAD']).stdout);
    added += stat.added;
    deleted += stat.deleted;
  } else {
    const staged = parseNumstat(runGit(ws, ['diff', '--numstat', '--cached']).stdout);
    const unstaged = parseNumstat(runGit(ws, ['diff', '--numstat']).stdout);
    added += staged.added + unstaged.added;
    deleted += staged.deleted + unstaged.deleted;
  }

  for (const uf of untrackedFiles) {
    added += countUntrackedLines(ws, uf);
  }

  const totalChangedLines = added + deleted;
  const highRiskHits = matchHighRisk(changedFiles);

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

  let diffChunks = [];
  if (headExists) {
    const d = runGit(ws, ['diff', 'HEAD']).stdout || '';
    if (d) diffChunks.push(d);
  } else {
    const d1 = runGit(ws, ['diff', '--cached']).stdout || '';
    const d2 = runGit(ws, ['diff']).stdout || '';
    if (d1) diffChunks.push(d1);
    if (d2) diffChunks.push(d2);
  }
  for (const uf of untrackedFiles) {
    const ud = formatUntrackedDiff(ws, uf);
    if (ud) diffChunks.push(ud);
  }

  const fullDiff = diffChunks.join('\n').trim();
  const diffLines = fullDiff ? fullDiff.split(/\r?\n/) : [];
  const truncated = diffLines.length > maxDiffLines;
  summary.diffTruncated = truncated;
  summary.diffTotalLines = diffLines.length;
  summary.diff = truncated
    ? `${diffLines.slice(0, maxDiffLines).join('\n')}\n... [truncated ${diffLines.length - maxDiffLines} lines]`
    : fullDiff;

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
