#!/usr/bin/env node
'use strict';
// SessionStart index hook: fail-open, dependency-free, cross-platform.
// Any malformed input / missing workspace / filesystem error emits {} and exits 0.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
const CHECK_UPDATE_SCRIPT = path.join(PLUGIN_ROOT, 'scripts', 'check-update.mjs');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v || '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function isNewerSemver(latest, current) {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

function readUpdateNotice() {
  if (process.env.SDD_FORGE_NO_UPDATE_CHECK === '1') return '';
  let current = '';
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PLUGIN_ROOT, '.antigravity-plugin', 'plugin.json'), 'utf8')
    );
    current = typeof manifest?.version === 'string' ? manifest.version : '';
  } catch {
    return '';
  }
  if (!current) return '';

  const cachePath =
    process.env.SDD_FORGE_UPDATE_CACHE ||
    path.join(os.homedir(), '.agents', 'sdd-forge-update-cache.json');

  let cache = null;
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch {
    cache = null;
  }

  const now = Date.now();
  const stale = !cache || typeof cache.checkedAt !== 'number' || now - cache.checkedAt > CHECK_INTERVAL_MS;
  if (stale && fs.existsSync(CHECK_UPDATE_SCRIPT)) {
    try {
      const child = spawn(process.execPath, [CHECK_UPDATE_SCRIPT], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    } catch {
      // fail-open
    }
  }

  if (cache?.latest && isNewerSemver(cache.latest, current)) {
    return `发现新版本 ${cache.latest}（当前 v${current}），运行 curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash 升级。`;
  }
  return '';
}

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
      tickets += countMdFiles(sub);
      continue;
    }
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
  const updateNotice = readUpdateNotice();

  const found = [];
  if (ws) {
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
  }

  if (found.length === 0 && !updateNotice) return {};
  const parts = [];
  if (found.length > 0) {
    parts.push(
      `[SDD Forge] 工作区资产：${found.join('、')}。` +
        '规划前读 docs/architecture.md 与 GLOSSARY.md；动脑需求走 /grill-with-docs → /implement。' +
        `审查范围脚本：${REVIEW_SCOPE_SCRIPT}`
    );
  }
  if (updateNotice) {
    parts.push(`[SDD Forge] ${updateNotice}`);
  }
  return { injectSteps: [{ systemMessage: { systemMessage: parts.join('\n') } }] };
}

let result = {};
try {
  result = main();
} catch {
  result = {};
}
process.stdout.write(`${JSON.stringify(result)}\n`);
