import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { computeReviewScope, matchHighRisk } from '../scripts/review-scope.mjs';

function makeTempGitRepo({ commit = true } = {}) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-scope-'));
  const git = (args) => execFileSync('git', args, { cwd: ws, encoding: 'utf8' });
  git(['init']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  if (commit) {
    fs.writeFileSync(path.join(ws, 'a.ts'), 'export const x = 1;\n');
    git(['add', '.']);
    git(['commit', '-m', 'init']);
  }
  return {
    ws,
    git,
    cleanup: () => fs.rmSync(ws, { recursive: true, force: true }),
  };
}

test('matchHighRisk catches camelCase/hyphen auth and proto/graphql while avoiding author.ts and .env.example', () => {
  const hits = matchHighRisk([
    'src/user-auth.ts',
    'src/authMiddleware.ts',
    'src/useAuth.ts',
    'src/author.ts',
    'api/user.proto',
    'api/user.graphql',
    '.env',
    '.env.production',
    '.env.example',
    '.env.sample',
  ]);
  const hitFiles = hits.map((h) => h.file).sort();
  assert.deepEqual(hitFiles, [
    '.env',
    '.env.production',
    'api/user.graphql',
    'api/user.proto',
    'src/authMiddleware.ts',
    'src/useAuth.ts',
    'src/user-auth.ts',
  ]);
});

test('rename counts as 1 file while original high-risk path still triggers high-risk hit', () => {
  const { ws, git, cleanup } = makeTempGitRepo();
  try {
    fs.mkdirSync(path.join(ws, 'src', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'src', 'auth', 'login.ts'), 'export const login = () => {};\n');
    git(['add', '.']);
    git(['commit', '-m', 'add auth']);

    git(['mv', 'src/auth/login.ts', 'src/login.ts']);
    const scope = computeReviewScope(ws);
    assert.equal(scope.fileCount, 1);
    assert.deepEqual(scope.changedFiles, ['src/login.ts']);
    assert.equal(scope.scoreBreakdown.fileScore, 0);
    assert.equal(scope.highRiskHits.some((h) => h.file === 'src/auth/login.ts'), true);
    assert.equal(scope.route, 'dual-axis-high-risk');
  } finally {
    cleanup();
  }
});

test('lockfiles are ignored from complexity score and diff budget so real code is never starved', () => {
  const { ws, cleanup } = makeTempGitRepo();
  try {
    fs.writeFileSync(
      path.join(ws, 'package-lock.json'),
      Array.from({ length: 700 }, (_, i) => `"line_${i}": ${i},`).join('\n') + '\n',
    );
    fs.writeFileSync(path.join(ws, 'src_real.ts'), 'export const criticalBug = true;\n');

    const scope = computeReviewScope(ws, { withDiff: true, maxDiffLines: 100 });
    assert.deepEqual(scope.ignoredFiles, ['package-lock.json']);
    assert.equal(scope.fileCount, 1);
    assert.equal(scope.totalChangedLines, 1);
    assert.equal(scope.complexity, 1);
    assert.equal(scope.route, 'single-axis');
    assert.equal(scope.diffTruncated, false);
    assert.equal(scope.diff.includes('criticalBug'), true);
  } finally {
    cleanup();
  }
});

test('per-file diff budget preserves every changed file when one file is huge', () => {
  const { ws, cleanup } = makeTempGitRepo();
  try {
    fs.writeFileSync(
      path.join(ws, 'aaa_large.ts'),
      Array.from({ length: 300 }, (_, i) => `export const v${i} = ${i};`).join('\n') + '\n',
    );
    fs.writeFileSync(path.join(ws, 'zzz_small.ts'), 'export const importantTail = 42;\n');

    const scope = computeReviewScope(ws, { withDiff: true, maxDiffLines: 60 });
    assert.equal(scope.diffTruncated, true);
    assert.equal(scope.diff.includes('aaa_large.ts'), true);
    assert.equal(scope.diff.includes('importantTail'), true);
  } finally {
    cleanup();
  }
});

test('computeReviewScope works in a fresh git repo with no HEAD commit', () => {
  const { ws, git, cleanup } = makeTempGitRepo({ commit: false });
  try {
    fs.writeFileSync(path.join(ws, 'init.ts'), 'export const a = 1;\nexport const b = 2;\n');
    git(['add', 'init.ts']);
    const scope = computeReviewScope(ws, { withDiff: true });
    assert.equal(scope.headExists, false);
    assert.equal(scope.fileCount, 1);
    assert.equal(scope.totalChangedLines, 2);
    assert.equal(scope.diff.includes('export const a = 1;'), true);
  } finally {
    cleanup();
  }
});
