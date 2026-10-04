import assert from 'node:assert/strict';
import test from 'node:test';
import { createVercelReader, deploymentIdentity } from './vercel-read.mjs';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const make = (sha = SHA, state = 'READY') => ({
  id: 'dpl_test',
  meta: { githubCommitSha: sha },
  readyState: state,
  projectId: 'prj_dTKsVA4Kn1Ae6UDA5xw3eUa3Km82',
  target: 'production',
  env: [{ value: 'SECRET' }],
});

test('only exact READY commit currently assigned to bendd.me is ready', async () => {
  const paths = [];
  const reader = createVercelReader({
    request: async path => {
      paths.push(path);
      return make();
    },
  });
  assert.equal((await reader.readiness(SHA)).status, 'ready');
  assert.deepEqual(paths, ['/v13/deployments/bendd.me']);
  assert.ok(!JSON.stringify(await reader.current()).includes('SECRET'));
});

for (const [name, state, expected] of [
  ['building', 'BUILDING', 'waiting'],
  ['failed', 'ERROR', 'failed'],
  ['READY before alias assignment', 'READY', 'waiting'],
]) {
  test(`${name} deployment does not substitute for exact production recovery`, async () => {
    const reader = createVercelReader({
      request: async path =>
        path.endsWith('bendd.me')
          ? make(OTHER)
          : path === '/v6/deployments'
            ? { deployments: [make(SHA, state)] }
            : make(SHA, state),
    });
    assert.equal((await reader.readiness(SHA)).status, expected);
  });
}

test("another project's production cannot satisfy readiness", async () => {
  const reader = createVercelReader({
    request: async () => ({ ...make(), projectId: 'another' }),
  });
  await assert.rejects(reader.readiness(SHA), /identity mismatch/);
});

test('Vercel 403 is propagated once without authentication fallback', async () => {
  let calls = 0;
  const reader = createVercelReader({
    request: async () => {
      calls += 1;
      throw new Error('Vercel HTTP 403; stop and request access');
    },
  });
  await assert.rejects(reader.readiness(SHA), /HTTP 403/);
  assert.equal(calls, 1);
});

test('projection excludes arbitrary environment and authentication fields', () => {
  const value = deploymentIdentity({
    ...make(),
    token: 'SECRET',
    private: 'SECRET',
  });
  assert.deepEqual(Object.keys(value), [
    'id',
    'sha',
    'state',
    'target',
    'project_id',
    'url',
  ]);
  assert.ok(!JSON.stringify(value).includes('SECRET'));
});
