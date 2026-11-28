'use strict';
// Shared Git status & process helpers for sdd-forge scripts.

import { spawnSync } from 'node:child_process';

export function runGit(ws, args, { timeout = 5000, maxBuffer = 10 * 1024 * 1024 } = {}) {
  return spawnSync('git', args, {
    cwd: ws,
    encoding: 'utf8',
    timeout,
    windowsHide: true,
    maxBuffer,
  });
}

export function hasHeadCommit(ws) {
  const res = runGit(ws, ['rev-parse', '--verify', 'HEAD']);
  return !res.error && res.status === 0;
}

// Parse `git status --porcelain=v1 -z -uall` handling renames, copies, spaces, and UTF-8 paths.
export function parsePorcelainZ(raw) {
  const entries = [];
  if (!raw) return entries;
  const tokens = raw.split('\0');
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || token.length < 4) continue;
    const xy = token.slice(0, 2);
    const file = token.slice(3).replace(/\\/g, '/');
    let origFile = '';
    // In -z mode, renames ('R') and copies ('C') emit the original path as the next NUL token.
    if (xy.includes('R') || xy.includes('C')) {
      origFile = (tokens[i + 1] || '').replace(/\\/g, '/');
      i += 1;
    }
    entries.push({ xy, file, origFile, untracked: xy === '??' });
  }
  return entries;
}
