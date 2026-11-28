import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_SH = path.join(REPO_ROOT, 'install.sh');

test('install.sh --init-only from a nested subdirectory writes templates to git repo root and is idempotent', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-install-'));
  try {
    execFileSync('git', ['init'], { cwd: repo, encoding: 'utf8' });
    const nested = path.join(repo, 'packages', 'web');
    fs.mkdirSync(nested, { recursive: true });

    const cleanEnv = { ...process.env, BASH_ENV: '' };
    const r1 = spawnSync('bash', [INSTALL_SH, '--init-only'], { cwd: nested, encoding: 'utf8', env: cleanEnv });
    assert.equal(r1.status, 0, r1.stderr);

    // Must write at repo root, NOT inside nested subdirectory.
    assert.equal(fs.existsSync(path.join(repo, 'docs', 'constitution.md')), true);
    assert.equal(fs.existsSync(path.join(repo, 'docs', 'architecture.md')), true);
    assert.equal(fs.existsSync(path.join(repo, 'docs', 'coding-standards.md')), true);
    assert.equal(fs.existsSync(path.join(nested, 'docs')), false);

    // Must not overwrite existing files on re-run.
    const custom = '# Custom Constitution\n';
    fs.writeFileSync(path.join(repo, 'docs', 'constitution.md'), custom);
    const r2 = spawnSync('bash', [INSTALL_SH, '--init-only'], { cwd: nested, encoding: 'utf8', env: cleanEnv });
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(fs.readFileSync(path.join(repo, 'docs', 'constitution.md'), 'utf8'), custom);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
