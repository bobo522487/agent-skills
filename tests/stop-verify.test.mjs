import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { detectRunner, inspectWorkspaceChanges } from '../scripts/stop-verify.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STOP_SCRIPT = path.join(REPO_ROOT, 'scripts', 'stop-verify.mjs');

function makeTempGitRepo(pkgScripts = { 'lint:boundaries': 'exit 1' }) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-stop-ws-'));
  const art = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-stop-art-'));
  const git = (args) => execFileSync('git', args, { cwd: ws, encoding: 'utf8' });
  git(['init']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({ scripts: pkgScripts }));
  git(['add', '.']);
  git(['commit', '-m', 'init']);
  return { ws, art, cleanup: () => { fs.rmSync(ws, { recursive: true, force: true }); fs.rmSync(art, { recursive: true, force: true }); } };
}

function runStop(ws, art, extraPayload = {}, extraEnv = {}) {
  const payload = JSON.stringify({
    workspacePaths: [ws],
    artifactDirectoryPath: art,
    ...extraPayload,
  });
  const res = spawnSync('node', [STOP_SCRIPT], {
    input: payload,
    encoding: 'utf8',
    env: { ...process.env, GEMINI_HOME: path.join(art, 'empty-gemini'), HOME: path.join(art, 'empty-home'), ...extraEnv },
  });
  assert.equal(res.status, 0);
  return { out: JSON.parse(res.stdout.trim()), stderr: res.stderr };
}

test('inspectWorkspaceChanges hashes actual content so 1-line in-place edits change contentHash', () => {
  const { ws, cleanup } = makeTempGitRepo();
  try {
    fs.writeFileSync(path.join(ws, 'a.ts'), 'import { a } from "../lib/bad1";\n');
    const c1 = inspectWorkspaceChanges(ws);
    fs.writeFileSync(path.join(ws, 'a.ts'), 'import { a } from "../lib/bad2";\n');
    const c2 = inspectWorkspaceChanges(ws);
    assert.equal(c1.hasCodeChanges, true);
    assert.equal(c2.hasCodeChanges, true);
    assert.notEqual(c1.contentHash, c2.contentHash);
  } finally {
    cleanup();
  }
});

test('stop-verify caps consecutive blocks at 2 even when line count changes (prevents infinite loop)', () => {
  const { ws, art, cleanup } = makeTempGitRepo({ 'lint:boundaries': 'exit 1' });
  try {
    // Turn 1: initial failure -> block 1/2
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 2;\n');
    const r1 = runStop(ws, art, { stop_hook_active: false });
    assert.equal(r1.out.decision, 'continue');
    assert.match(r1.out.reason, /第 1\/2 次拦截/);

    // Turn 2: agent adds a line (changes diff --stat) and still fails -> block 2/2
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 2;\nexport const y = 3;\n');
    const r2 = runStop(ws, art, { stop_hook_active: true });
    assert.equal(r2.out.decision, 'continue');
    assert.match(r2.out.reason, /第 2\/2 次拦截/);

    // Turn 3: agent adds another line in same retry loop -> MUST allow to break loop
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 2;\nexport const y = 3;\nexport const z = 4;\n');
    const r3 = runStop(ws, art, { stop_hook_active: true });
    assert.equal(r3.out.decision, 'allow');

    // New user turn WITHOUT editing code -> stays suppressed
    const r4 = runStop(ws, art, { stop_hook_active: false });
    assert.equal(r4.out.decision, 'allow');

    // New user turn WITH actual new code edits -> re-arms gate
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 99;\n');
    const r5 = runStop(ws, art, { stop_hook_active: false });
    assert.equal(r5.out.decision, 'continue');
    assert.match(r5.out.reason, /第 1\/2 次拦截/);
  } finally {
    cleanup();
  }
});

test('stop-verify clears failure state once lint:boundaries passes', () => {
  const { ws, art, cleanup } = makeTempGitRepo({
    'lint:boundaries': 'node -e "process.exit(require(\'fs\').readFileSync(\'a.ts\',\'utf8\').includes(\'ok\') ? 0 : 1)"',
  });
  try {
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const bad = 1;\n');
    const r1 = runStop(ws, art, { stop_hook_active: false });
    assert.equal(r1.out.decision, 'continue');

    // 1-line in-place fix that passes
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const ok = 1;\n');
    const r2 = runStop(ws, art, { stop_hook_active: true });
    assert.equal(r2.out.decision, 'allow');
    assert.equal(fs.existsSync(path.join(art, 'sdd-forge-stop-count.json')), false);
  } finally {
    cleanup();
  }
});

test('stop-verify allows through when agy-fast manifest is detected', () => {
  const { ws, art, cleanup } = makeTempGitRepo({ 'lint:boundaries': 'exit 1' });
  try {
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const bad = 1;\n');
    const fastDir = path.join(ws, '.agents', 'plugins', 'agy-fast');
    fs.mkdirSync(fastDir, { recursive: true });
    fs.writeFileSync(path.join(fastDir, 'plugin.json'), '{}');

    const r = runStop(ws, art, { stop_hook_active: false });
    assert.equal(r.out.decision, 'allow');
  } finally {
    cleanup();
  }
});

test('detectRunner resolves packageManager field and lockfiles', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pm-'));
  try {
    assert.equal(detectRunner(tmp, { packageManager: 'pnpm@9.0.0' }).bin, 'pnpm');
    assert.equal(detectRunner(tmp, { packageManager: 'yarn@4.0.0' }).bin, 'yarn');
    assert.equal(detectRunner(tmp, { packageManager: 'bun@1.1.0' }).bin, 'bun');
    assert.equal(detectRunner(tmp, {}).bin, 'npm');

    fs.writeFileSync(path.join(tmp, 'pnpm-lock.yaml'), '');
    assert.equal(detectRunner(tmp, {}).bin, 'pnpm');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
