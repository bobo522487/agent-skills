#!/usr/bin/env node
'use strict';
// Stop boundary gate: fail-open, dependency-free, cross-platform.
// Runs `<runner> run lint:boundaries` once at turn end only when:
//   1. agy-fast is not installed (auto-detected via plugin manifest, no marker file)
//   2. the repo declares `scripts["lint:boundaries"]`
//   3. the workspace has uncommitted non-doc code changes (skips pure Q&A / /grill-with-docs)
//   4. consecutive Stop blocks have not exceeded MAX_CONTINUES (re-arms only on pass, clean tree,
//      or a brand-new user turn with actual content changes)

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasHeadCommit, parsePorcelainZ, runGit } from './lib/git-status.mjs';
import { readHookPayload, resolveWorkspace } from './lib/hook-io.mjs';

export { parsePorcelainZ };

const ALLOW = { decision: 'allow' };
const MAX_CONTINUES = 2;
const MAX_HASH_FILE_BYTES = 512 * 1024;

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

export function isCodePath(file) {
  if (!file) return false;
  const normalized = file.replace(/\\/g, '/');
  if (normalized.startsWith('.scratch/') || normalized.startsWith('docs/')) return false;
  if (/\.(md|txt)$/i.test(normalized)) return false;
  return true;
}

function computeContentHash(ws, rawStatus, entries) {
  const hash = crypto.createHash('sha256');
  hash.update(rawStatus);
  hash.update('\0');

  if (hasHeadCommit(ws)) {
    const diffRes = runGit(ws, ['diff', 'HEAD'], { timeout: 3000 });
    hash.update(diffRes.stdout || '');
  } else {
    const staged = runGit(ws, ['diff', '--cached'], { timeout: 3000 });
    const unstaged = runGit(ws, ['diff'], { timeout: 3000 });
    hash.update(staged.stdout || '');
    hash.update('\0');
    hash.update(unstaged.stdout || '');
  }

  // Include untracked code file contents (or size+mtime for large files) so in-place edits change hash.
  const untrackedCode = entries
    .filter((e) => e.untracked && isCodePath(e.file))
    .map((e) => e.file)
    .sort();
  for (const rel of untrackedCode) {
    hash.update('\0');
    hash.update(rel);
    hash.update('\0');
    try {
      const abs = path.join(ws, rel);
      const stat = fs.statSync(abs);
      if (stat.isFile() && stat.size <= MAX_HASH_FILE_BYTES) {
        hash.update(fs.readFileSync(abs));
      } else {
        hash.update(`${stat.size}:${Math.trunc(stat.mtimeMs)}`);
      }
    } catch {
      hash.update('missing');
    }
  }

  return hash.digest('hex').slice(0, 16);
}

export function inspectWorkspaceChanges(ws) {
  const statusRes = runGit(ws, ['status', '--porcelain=v1', '-z', '-uall'], { timeout: 3000 });
  // If not a git repo or git unavailable, do not skip solely on git error.
  if (statusRes.error || statusRes.status !== 0) {
    return { hasCodeChanges: true, contentHash: '' };
  }

  const rawStatus = statusRes.stdout || '';
  const entries = parsePorcelainZ(rawStatus);
  if (entries.length === 0) {
    return { hasCodeChanges: false, contentHash: '' };
  }

  const hasCodeChanges = entries.some((e) => isCodePath(e.file) || isCodePath(e.origFile));
  if (!hasCodeChanges) {
    return { hasCodeChanges: false, contentHash: '' };
  }

  return {
    hasCodeChanges: true,
    contentHash: computeContentHash(ws, rawStatus, entries),
  };
}

export function detectRunner(ws, pkg) {
  const pmField = typeof pkg?.packageManager === 'string' ? pkg.packageManager.split('@')[0] : '';
  let runner = '';
  if (['pnpm', 'yarn', 'bun', 'npm'].includes(pmField)) {
    runner = pmField;
  } else if (fs.existsSync(path.join(ws, 'pnpm-lock.yaml'))) {
    runner = 'pnpm';
  } else if (fs.existsSync(path.join(ws, 'yarn.lock'))) {
    runner = 'yarn';
  } else if (fs.existsSync(path.join(ws, 'bun.lock')) || fs.existsSync(path.join(ws, 'bun.lockb'))) {
    runner = 'bun';
  } else {
    runner = 'npm';
  }

  switch (runner) {
    case 'pnpm':
      return { bin: 'pnpm', args: ['run', '--silent', 'lint:boundaries'] };
    case 'yarn':
      return { bin: 'yarn', args: ['--silent', 'run', 'lint:boundaries'] };
    case 'bun':
      return { bin: 'bun', args: ['run', '--silent', 'lint:boundaries'] };
    default:
      return { bin: 'npm', args: ['run', '-s', 'lint:boundaries'] };
  }
}

function getStateFile(payload) {
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

function readState(stateFile) {
  if (!stateFile) return { count: 0, contentHash: '' };
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const count = Number.isInteger(data?.count) && data.count >= 0 ? data.count : 0;
    const contentHash =
      typeof data?.contentHash === 'string'
        ? data.contentHash
        : typeof data?.fingerprint === 'string'
          ? data.fingerprint
          : '';
    return { count, contentHash };
  } catch {
    return { count: 0, contentHash: '' };
  }
}

function writeState(stateFile, state) {
  if (!stateFile) return;
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8');
  } catch {
    // ignore
  }
}

function clearState(stateFile) {
  if (!stateFile) return;
  try {
    fs.rmSync(stateFile, { force: true });
  } catch {
    // ignore
  }
}

function main() {
  const payload = readHookPayload();
  const ws = resolveWorkspace(payload);
  if (!ws) return ALLOW;

  // When agy-fast is installed, edit-time verification is handled inline via apply_edits(verify).
  if (hasAgyFast(ws)) return ALLOW;

  const stateFile = getStateFile(payload);
  const { hasCodeChanges, contentHash } = inspectWorkspaceChanges(ws);
  // Skip pure Q&A / /grill-with-docs turns that did not touch code files.
  if (!hasCodeChanges) {
    clearState(stateFile);
    return ALLOW;
  }

  const prevState = readState(stateFile);
  let effectiveCount = prevState.count;

  if (effectiveCount >= MAX_CONTINUES) {
    // Re-arm only when explicitly starting a new user turn (stop_hook_active === false)
    // AND the actual dirty code content has changed since the last suppressed snapshot.
    const isFreshUserTurnWithEdits =
      payload.stop_hook_active === false &&
      Boolean(contentHash) &&
      contentHash !== prevState.contentHash;
    if (!isFreshUserTurnWithEdits) {
      if (contentHash && contentHash !== prevState.contentHash) {
        writeState(stateFile, { count: effectiveCount, contentHash });
      }
      return ALLOW;
    }
    effectiveCount = 0;
  }

  const pkgPath = path.join(ws, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return ALLOW;
  }
  if (!pkg?.scripts || typeof pkg.scripts['lint:boundaries'] !== 'string') return ALLOW;

  const { bin, args } = detectRunner(ws, pkg);
  const res = spawnSync(bin, args, {
    cwd: ws,
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
    // On Windows (Node 18.20+/20.12+/22+), invoking .cmd shims without shell: true throws EINVAL.
    // bin and args are fixed constants above (no untrusted user input).
    shell: process.platform === 'win32',
  });

  if (res.error) {
    // Fail-open on spawn error / timeout, but do NOT clear failure state and emit diagnostic to stderr.
    const errTag = res.error.code || res.error.message || 'unknown error';
    process.stderr.write(`[SDD Forge] stop-verify skipped (${bin} lint:boundaries ${errTag})\n`);
    return ALLOW;
  }

  if (res.status === 0) {
    clearState(stateFile);
    return ALLOW;
  }

  // Fallback guard when artifactDirectoryPath is absent.
  if (!stateFile && payload.stop_hook_active === true) return ALLOW;

  const nextCount = effectiveCount + 1;
  writeState(stateFile, { count: nextCount, contentHash });

  const combined = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
  const excerpt = combined.split(/\r?\n/).slice(0, 30).join('\n');
  const reason = excerpt
    ? `[SDD Forge] ${bin} lint:boundaries 未通过（第 ${nextCount}/${MAX_CONTINUES} 次拦截，请修复后重跑；满 2 轮仍失败请停止盲修并建议 /rewind）：\n${excerpt}`
    : `[SDD Forge] ${bin} lint:boundaries 未通过（第 ${nextCount}/${MAX_CONTINUES} 次拦截，请修复后重跑）。`;
  return { decision: 'continue', reason };
}

// Run only when invoked directly as CLI (allows unit-testing exported helpers).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  let result = ALLOW;
  try {
    result = main();
  } catch {
    result = ALLOW;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
