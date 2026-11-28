'use strict';
// Shared fail-open stdin & workspace resolution for Antigravity hook scripts.

import fs from 'node:fs';
import path from 'node:path';

export function readHookPayload() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return null;
  }
}

export function resolveWorkspace(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const paths = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  const candidate =
    paths.find((p) => typeof p === 'string' && p.length > 0) ||
    (typeof payload.cwd === 'string' ? payload.cwd : '');
  if (!candidate) return '';

  try {
    const ws = path.resolve(candidate);
    return fs.statSync(ws).isDirectory() ? ws : '';
  } catch {
    return '';
  }
}
