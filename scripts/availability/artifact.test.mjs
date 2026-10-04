import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('uploads availability state from the hidden directory between runs', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/availability.yml', import.meta.url),
    'utf8'
  );
  const upload = workflow.slice(
    workflow.indexOf('- name: Save state and report')
  );
  assert.match(upload, /if: always\(\)/);
  assert.match(upload, /name: availability-state/);
  assert.match(upload, /path: \.availability\/\*\.json/);
  assert.match(upload, /include-hidden-files: true/);
});
