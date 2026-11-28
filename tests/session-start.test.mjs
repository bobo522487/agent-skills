import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SESSION_START = path.join(REPO_ROOT, 'scripts', 'session-start.mjs');

test('session-start fails open with {} on malformed stdin', () => {
  const res = spawnSync('node', [SESSION_START], { input: '{broken json', encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.deepEqual(JSON.parse(res.stdout.trim()), {});
});

test('session-start injects discovered docs, scratch assets, and absolute review-scope path', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-start-'));
  try {
    fs.mkdirSync(path.join(ws, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'docs', 'architecture.md'), '# Arch\n');
    fs.mkdirSync(path.join(ws, '.scratch', 'feat-a', 'issues'), { recursive: true });
    fs.writeFileSync(path.join(ws, '.scratch', 'feat-a', 'spec.md'), '# Spec\n');
    fs.writeFileSync(path.join(ws, '.scratch', 'feat-a', 'issues', '01.md'), '# Ticket\n');

    const res = spawnSync('node', [SESSION_START], {
      input: JSON.stringify({ workspacePaths: [ws] }),
      encoding: 'utf8',
    });
    assert.equal(res.status, 0);
    const parsed = JSON.parse(res.stdout.trim());
    const msg = parsed.injectSteps[0].systemMessage.systemMessage;
    assert.equal(msg.includes('docs/architecture.md'), true);
    assert.equal(msg.includes('.scratch/*/spec.md（1 份）'), true);
    assert.equal(msg.includes('.scratch/*/issues/（1 份 Ticket）'), true);
    assert.equal(msg.includes(path.join(REPO_ROOT, 'scripts', 'review-scope.mjs')), true);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});
