#!/usr/bin/env node
'use strict';
// Stop boundary gate: fail-open, dependency-free, cross-platform.
// Runs `npm run -s lint:boundaries` once at turn end when declared by the repo
// and when agy-fast is not installed (auto-detected via plugin.json, no marker file).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ALLOW = { decision: 'allow' };

function hasAgyFast(ws) {
  const env = process.env;
  const home = (() => {
    try {
      return os.homedir();
    } catch {
      return '';
    }
  })();
  const candidates = [
    env.GEMINI_HOME ? path.join(env.GEMINI_HOME, 'config', 'plugins', 'agy-fast', 'plugin.json') : '',
    home ? path.join(home, '.gemini', 'config', 'plugins', 'agy-fast', 'plugin.json') : '',
    path.join(ws, '.agents', 'plugins', 'agy-fast', 'plugin.json'),
  ].filter(Boolean);
  return candidates.some((file) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
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

  if (res.error || res.status === 0) return ALLOW;

  const combined = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
  const excerpt = combined.split(/\r?\n/).slice(0, 30).join('\n');
  const reason = excerpt
    ? `[SDD Forge] lint:boundaries 未通过，修复后重跑（前 30 行）：\n${excerpt}`
    : '[SDD Forge] lint:boundaries 未通过，修复后重跑。';
  return { decision: 'continue', reason };
}

let result = ALLOW;
try {
  result = main();
} catch {
  result = ALLOW;
}
process.stdout.write(`${JSON.stringify(result)}\n`);
