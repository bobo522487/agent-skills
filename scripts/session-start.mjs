#!/usr/bin/env node
'use strict';
// SessionStart index hook: fail-open, dependency-free, cross-platform.
// Any malformed input / missing workspace / filesystem error emits {} and exits 0.

import fs from 'node:fs';
import path from 'node:path';

const DOCS = [
  'docs/constitution.md',
  'docs/architecture.md',
  'docs/coding-standards.md',
  'GLOSSARY.md',
];

function main() {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (raw.trim()) payload = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!payload || typeof payload !== 'object') return {};

  const paths = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  const candidate = paths.find((p) => typeof p === 'string' && p.length > 0) ||
    (typeof payload.cwd === 'string' ? payload.cwd : '');
  if (!candidate) return {};

  let ws;
  try {
    ws = path.resolve(candidate);
    if (!fs.statSync(ws).isDirectory()) return {};
  } catch {
    return {};
  }

  const found = [];
  for (const rel of DOCS) {
    try {
      if (fs.statSync(path.join(ws, rel)).isFile()) found.push(rel);
    } catch {
      // absent is fine
    }
  }

  try {
    const issuesDir = path.join(ws, '.scratch', 'issues');
    if (fs.statSync(issuesDir).isDirectory()) {
      const count = fs.readdirSync(issuesDir).filter((name) => {
        if (!name.endsWith('.md')) return false;
        try {
          return fs.statSync(path.join(issuesDir, name)).isFile();
        } catch {
          return false;
        }
      }).length;
      if (count > 0) found.push(`.scratch/issues/ 下 ${count} 份 Ticket`);
    }
  } catch {
    // absent is fine
  }

  if (found.length === 0) return {};
  const message =
    `[SDD Forge] 工作区资产：${found.join('、')}。` +
    '规划前读 docs/architecture.md 与 GLOSSARY.md，收尾走 /review-router。';
  return { injectSteps: [{ systemMessage: { systemMessage: message } }] };
}

let result = {};
try {
  result = main();
} catch {
  result = {};
}
process.stdout.write(`${JSON.stringify(result)}\n`);
