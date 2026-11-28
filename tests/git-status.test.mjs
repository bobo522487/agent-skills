import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePorcelainZ } from '../scripts/lib/git-status.mjs';

test('parsePorcelainZ handles normal, spaces, UTF-8, renames, copies, and untracked files', () => {
  const raw = [
    ' M src/app.ts',
    '?? src/中文 路径/new file.ts',
    'R  src/new-name.ts',
    'src/old-name.ts',
    'C  src/copied.ts',
    'src/source.ts',
    '',
  ].join('\0');

  const entries = parsePorcelainZ(raw);
  assert.deepEqual(entries, [
    { xy: ' M', file: 'src/app.ts', origFile: '', untracked: false },
    { xy: '??', file: 'src/中文 路径/new file.ts', origFile: '', untracked: true },
    { xy: 'R ', file: 'src/new-name.ts', origFile: 'src/old-name.ts', untracked: false },
    { xy: 'C ', file: 'src/copied.ts', origFile: 'src/source.ts', untracked: false },
  ]);
});

test('parsePorcelainZ returns empty array for empty input', () => {
  assert.deepEqual(parsePorcelainZ(''), []);
  assert.deepEqual(parsePorcelainZ(null), []);
});
