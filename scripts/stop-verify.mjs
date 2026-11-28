#!/usr/bin/env node
'use strict';
// Stop boundary gate: fail-open, dependency-free, cross-platform.
// Runs `npm run -s lint:boundaries` once at turn end only when:
//   1. agy-fast is not installed (auto-detected via plugin manifest, no marker file)
//   2. the repo declares `scripts["lint:boundaries"]`
//   3. the workspace has uncommitted non-doc code changes (skips pure Q&A / /grill-with-docs)
//   4. consecutive Stop blocks have not exceeded MAX_CONTINUES (prevents infinite loops)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ALLOW = { decision: 'allow' };
const MAX_CONTINUES = 2;

function hasAgyFast(ws) {
  const env = process.env;
  const home = (() => {
    try {
      return os.homedir();
    } catch {
      return '';
    }
  })();
  const dirs = [
    env.GEMINI_HOME ? path.join(env.GEMINI_HOME, 'config', 'plugins', 'agy-fast') : '',
    home ? path.join(home, '.gemini', 'config', 'plugins', 'agy-fast') : '',
    home ? path.join(home, '.agents', 'plugins', 'agy-fast') : '',
    path.join(ws, '.agents', 'plugins', 'agy-fast'),
  ].filter(Boolean);

  for (const dir of dirs) {
    for (const rel of ['plugin.json', path.join('.antigravity-plugin', 'plugin.json')]) {
      try {
        if (fs.statSync(path.join(dir, rel)).isFile()) return true;
      } catch {
        // absent is fine
      }
    }
  }
  return false;
}

function hasUncommittedCodeChanges(ws) {
  const res = spawnSync('git', ['status', '--porcelain', '-uall'], {
    cwd: ws,
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true,
  });
  // If not a git repo or git unavailable, do not skip solely on git error.
  if (res.error || res.status !== 0) return true;
  const lines = (res.stdout || '').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.some((line) => {
    const file = line.slice(3).trim().replace(/^"|"$/g, '');
    if (!file) return false;
    if (file.startsWith('.scratch/') || file.startsWith('docs/')) return false;
    if (/\.(md|txt)$/i.test(file)) return false;
    return true;
  });
}

function getCounterFile(payload) {
  const dir = typeof payload.artifactDirectoryPath === 'string' ? payload.artifactDirectoryPath : '';
  if (!dir) return '';
  try {
    if (fs.statSync(dir).isDirectory()) {
      return path.join(dir, 'sdd-forge-stop-count.json');
    }
  } catch {
    // absent is fine
  }
  return '';
}

function readCount(counterFile) {
  if (!counterFile) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
    return Number.isInteger(data?.count) && data.count >= 0 ? data.count : 0;
  } catch {
    return 0;
  }
}

function writeCount(counterFile, count) {
  if (!counterFile) return;
  try {
    fs.writeFileSync(counterFile, JSON.stringify({ count }), 'utf8');
  } catch {
    // ignore
  }
}

function clearCount(counterFile) {
  if (!counterFile) return;
  try {
    fs.rmSync(counterFile, { force: true });
  } catch {
    // ignore
  }
}

function main() {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (raw.trim()) payload = JSON.parse(raw);
  } catch {
    return ALLOW;
  }
  if (!payload || typeof payload !== 'object') return ALLOW;

  const paths = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  const candidate = paths.find((p) => typeof p === 'string' && p.length > 0) ||
    (typeof payload.cwd === 'string' ? payload.cwd : '');
  if (!candidate) return ALLOW;

  let ws;
  try {
    ws = path.resolve(candidate);
    if (!fs.statSync(ws).isDirectory()) return ALLOW;
  } catch {
    return ALLOW;
  }

  // When agy-fast is installed, edit-time verification is handled inline via apply_edits(verify).
  if (hasAgyFast(ws)) return ALLOW;

  const counterFile = getCounterFile(payload);
  // Skip pure Q&A / /grill-with-docs turns that did not touch code files.
  if (!hasUncommittedCodeChanges(ws)) {
    clearCount(counterFile);
    return ALLOW;
  }

  const pkgPath = path.join(ws, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return ALLOW;
  }
  if (!pkg?.scripts || typeof pkg.scripts['lint:boundaries'] !== 'string') return ALLOW;

  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = spawnSync(npmBin, ['run', '-s', 'lint:boundaries'], {
    cwd: ws,
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
  });

  if (res.error || res.status === 0) {
    clearCount(counterFile);
    return ALLOW;
  }

  // Guard against infinite Stop -> continue loops (matches AGENTS.md max 2 retries).
  if (!counterFile && payload.stop_hook_active === true) return ALLOW;
  const nextCount = readCount(counterFile) + 1;
  if (nextCount > MAX_CONTINUES) {
    clearCount(counterFile);
    return ALLOW;
  }
  writeCount(counterFile, nextCount);

  const combined = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
  const excerpt = combined.split(/\r?\n/).slice(0, 30).join('\n');
  const reason = excerpt
    ? `[SDD Forge] lint:boundaries 未通过（第 ${nextCount}/${MAX_CONTINUES} 次拦截，请修复后重跑；满 2 轮仍失败请停止盲修并建议 /rewind）：\n${excerpt}`
    : `[SDD Forge] lint:boundaries 未通过（第 ${nextCount}/${MAX_CONTINUES} 次拦截，请修复后重跑）。`;
  return { decision: 'continue', reason };
}

let result = ALLOW;
try {
  result = main();
} catch {
  result = ALLOW;
}
process.stdout.write(`${JSON.stringify(result)}\n`);
