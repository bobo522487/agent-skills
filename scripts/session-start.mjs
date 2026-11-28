#!/usr/bin/env node
'use strict';
// SessionStart index hook: fail-open, dependency-free, cross-platform.
// Any malformed input / missing workspace / filesystem error emits {} and exits 0.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readHookPayload, resolveWorkspace } from './lib/hook-io.mjs';

const DOCS = [
  'docs/constitution.md',
  'docs/architecture.md',
  'docs/coding-standards.md',
  'GLOSSARY.md',
];

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_SCOPE_SCRIPT = path.join(PLUGIN_ROOT, 'scripts', 'review-scope.mjs');

function countScratchAssets(ws) {
  const scratchDir = path.join(ws, '.scratch');
  let entries;
  try {
    if (!fs.statSync(scratchDir).isDirectory()) return { specs: 0, tickets: 0 };
    entries = fs.readdirSync(scratchDir, { withFileTypes: true });
  } catch {
    return { specs: 0, tickets: 0 };
  }

  let specs = 0;
  let tickets = 0;

  const countMdFiles = (dir) => {
    try {
      return fs.readdirSync(dir).filter((name) => {
        if (!name.endsWith('.md')) return false;
        try {
          return fs.statSync(path.join(dir, name)).isFile();
        } catch {
          return false;
        }
      }).length;
    } catch {
      return 0;
    }
  };

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sub = path.join(scratchDir, entry.name);
    if (entry.name === 'issues') {
      // Fallback for flat .scratch/issues/*.md
      tickets += countMdFiles(sub);
      continue;
    }
    // Canonical mattpocock/skills layout: .scratch/<feature-slug>/{spec.md, issues/*.md}
    try {
      if (fs.statSync(path.join(sub, 'spec.md')).isFile()) specs += 1;
    } catch {
      // absent is fine
    }
    tickets += countMdFiles(path.join(sub, 'issues'));
  }

  return { specs, tickets };
}

function main() {
  const payload = readHookPayload();
  const ws = resolveWorkspace(payload);
  if (!ws) return {};

  const found = [];
  for (const rel of DOCS) {
    try {
      if (fs.statSync(path.join(ws, rel)).isFile()) found.push(rel);
    } catch {
      // absent is fine
    }
  }

  const { specs, tickets } = countScratchAssets(ws);
  if (specs > 0) found.push(`.scratch/*/spec.md（${specs} 份）`);
  if (tickets > 0) found.push(`.scratch/*/issues/（${tickets} 份 Ticket）`);

  if (found.length === 0) return {};
  const message =
    `[SDD Forge] 工作区资产：${found.join('、')}。` +
    '规划前读 docs/architecture.md 与 GLOSSARY.md；动脑需求走 /grill-with-docs → /implement。' +
    `审查范围脚本：${REVIEW_SCOPE_SCRIPT}`;
  return { injectSteps: [{ systemMessage: { systemMessage: message } }] };
}

let result = {};
try {
  result = main();
} catch {
  result = {};
}
process.stdout.write(`${JSON.stringify(result)}\n`);
