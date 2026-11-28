#!/usr/bin/env node
'use strict';
// Detached background update checker: fail-open, zero dependencies, 3s timeout.
// Writes latest GitHub Release tag to ~/.agents/sdd-forge-update-cache.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = process.env.SDD_FORGE_REPO || 'bobo522487/agent-skills';
const CACHE_PATH =
  process.env.SDD_FORGE_UPDATE_CACHE ||
  path.join(os.homedir(), '.agents', 'sdd-forge-update-cache.json');

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sdd-forge-update-checker',
      },
      signal: controller.signal,
    });
    if (!res.ok) return;
    const data = await res.json();
    const latest = typeof data?.tag_name === 'string' ? data.tag_name.trim() : '';
    if (!latest) return;

    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(
      tmp,
      `${JSON.stringify({ checkedAt: Date.now(), latest }, null, 2)}\n`,
      'utf8'
    );
    fs.renameSync(tmp, CACHE_PATH);
  } finally {
    clearTimeout(timer);
  }
}

main().catch(() => {});
