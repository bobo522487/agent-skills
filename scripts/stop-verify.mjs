#!/usr/bin/env node
'use strict';
// Stop boundary gate: fail-open, dependency-free, cross-platform.
// Runs `<runner> run lint:boundaries` once at turn end only when:
//   1. agy-fast is not installed (auto-detected via plugin manifest, no marker file)
//   2. the repo declares `scripts["lint:boundaries"]`
//   3. the workspace has uncommitted non-doc code changes (skips pure Q&A / /grill-with-docs)
//   4. consecutive Stop blocks for the same workspace fingerprint have not exceeded MAX_CONTINUES

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readHookPayload, resolveWorkspace } from './lib/hook-io.mjs';

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

function isCodePath(file) {
  if (!file) return false;
  const normalized = file.replace(/\\/g, '/');
  if (normalized.startsWith('.scratch/') || normalized.startsWith('docs/')) return false;
  if (/\.(md|txt)$/i.test(normalized)) return false;
  return true;
}

// Parse `git status --porcelain=v1 -z -uall` to handle renames, spaces, and non-ASCII paths cleanly.
export function parsePorcelainZ(raw) {
  if (!raw) return [];
  const tokens = raw.split('\0');
  const files = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const entry = tokens[i];
    if (!entry || entry.length < 4) continue;
    const xy = entry.slice(0, 2);
    const primary = entry.slice(3);
    if (primary) files.push(primary);
    // In -z mode, renames ('R') and copies ('C') are followed by the original path as the next NUL token.
    if (xy.includes('R') || xy.includes('C')) {
      const orig = tokens[i + 1];
      if (orig) files.push(orig);
      i += 1;
    }
  }
  return files;
}

function inspectWorkspaceChanges(ws) {
  const statusRes = spawnSync('git', ['status', '--porcelain=v1', '-z', '-uall'], {
    cwd: ws,
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true,
  });
  // If not a git repo or git unavailable, do not skip solely on git error.
  if (statusRes.error || statusRes.status !== 0) {
    return { hasCodeChanges: true, fingerprint: '' };
  }

  const rawStatus = statusRes.stdout || '';
  const files = parsePorcelainZ(rawStatus);
  if (files.length === 0) {
    return { hasCodeChanges: false, fingerprint: '' };
  }

  const hasCodeChanges = files.some(isCodePath);
  if (!hasCodeChanges) {
    return { hasCodeChanges: false, fingerprint: '' };
  }

  const diffStatRes = spawnSync('git', ['diff', '--stat'], {
    cwd: ws,
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true,
  });
  const hash = crypto
    .createHash('sha256')
    .update(rawStatus)
    .update('\0')
    .update(diffStatRes.stdout || '')
    .digest('hex')
    .slice(0, 16);

  return { hasCodeChanges: true, fingerprint: hash };
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
  if (!stateFile) return { count: 0, fingerprint: '' };
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const count = Number.isInteger(data?.count) && data.count >= 0 ? data.count : 0;
    const fingerprint = typeof data?.fingerprint === 'string' ? data.fingerprint : '';
    return { count, fingerprint };
  } catch {
    return { count: 0, fingerprint: '' };
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
  const { hasCodeChanges, fingerprint } = inspectWorkspaceChanges(ws);
  // Skip pure Q&A / /grill-with-docs turns that did not touch code files.
  if (!hasCodeChanges) {
    clearState(stateFile);
    return ALLOW;
  }

  // If this exact dirty snapshot already exhausted MAX_CONTINUES, stay suppressed until code changes.
  const prevState = readState(stateFile);
  const effectiveCount =
    fingerprint && prevState.fingerprint === fingerprint ? prevState.count : 0;
  if (effectiveCount >= MAX_CONTINUES) {
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

  if (res.error || res.status === 0) {
    clearState(stateFile);
    return ALLOW;
  }

  // Fallback guard when artifactDirectoryPath is absent.
  if (!stateFile && payload.stop_hook_active === true) return ALLOW;

  const nextCount = effectiveCount + 1;
  writeState(stateFile, { count: nextCount, fingerprint });

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
