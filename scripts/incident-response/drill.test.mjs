import assert from 'node:assert/strict';
import test from 'node:test';
import { createDrillVercel, protectedPreviewFetch } from './drill-access.mjs';
import { assertDrillMerge } from './drill.mjs';
import { REQUIRED_CHECKS } from './policy.mjs';

test('drill cannot merge into main, another branch, another PR head or without exact gates', () => {
  const sha = 'a'.repeat(40);
  const repo = { full_name: 'jaem1n207/bendd' };
  const pr = {
    number: 12,
    state: 'open',
    draft: false,
    mergeable: true,
    mergeable_state: 'clean',
    user: { login: 'jaem1n207' },
    body: '<!-- bendd-incident-drill:v1 id=fixture -->',
    base: { ref: 'drill/fixture', repo },
    head: { ref: 'fix/drill-fixture', sha, repo },
  };
  const input = {
    id: 'fixture',
    sha,
    pr,
    files: [
      {
        filename: 'src/app/api/feed/route.ts',
        status: 'modified',
        patch: '@@ -1 +1 @@\n-return old;\n+return fixed;',
      },
    ],
    checks: REQUIRED_CHECKS.map(name => ({
      name,
      head_sha: sha,
      status: 'completed',
      conclusion: 'success',
    })),
    statuses: [
      {
        context: 'Vercel',
        state: 'success',
        target_url: 'https://vercel.com/jaemins-crafts/bendd/preview',
      },
    ],
    state: {
      version: 1,
      issue: 11,
      phase: 'awaiting_checks',
      attempt: 1,
      pr: 12,
      head_sha: sha,
      started_at: '2026-10-05T00:00:00Z',
      updated_at: '2026-10-05T00:00:00Z',
      milestones: {},
    },
  };
  assert.equal(assertDrillMerge(input).sha, sha);
  for (const ref of ['main', 'drill/other'])
    assert.throws(
      () =>
        assertDrillMerge({
          ...input,
          pr: { ...pr, base: { ...pr.base, ref } },
        }),
      /main is forbidden/
    );
  assert.throws(
    () => assertDrillMerge({ ...input, checks: [] }),
    /Required check/
  );
  assert.throws(
    () => assertDrillMerge({ ...input, sha: 'b'.repeat(40) }),
    /mismatch/
  );
});

test('temporary access is revoked even when the model or preview fails and existing keys survive', async () => {
  const calls = [];
  let issued = false;
  const api = createDrillVercel({
    request: async (path, method = 'GET', body) => {
      calls.push({ path, method, body });
      if (method === 'GET')
        return {
          id: 'prj_dTKsVA4Kn1Ae6UDA5xw3eUa3Km82',
          protectionBypass: {
            existing: {},
            ...(issued ? { ephemeral: {} } : {}),
          },
        };
      if (body.revoke) {
        assert.equal(body.revoke.secret, 'ephemeral');
        assert.equal(body.revoke.regenerate, false);
        issued = false;
        return {};
      }
      issued = true;
      return { protectionBypass: { existing: {}, ephemeral: {} } };
    },
  });
  await assert.rejects(
    api.withTemporaryAccess(async () => {
      throw new Error('model denied');
    }),
    /model denied/
  );
  assert.equal(issued, false);
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 2);
});
test('new access is never sent to production, external hosts or redirects', async () => {
  assert.throws(
    () => protectedPreviewFetch('https://bendd.me', 'private'),
    /verified drill Preview/
  );
  let calls = 0;
  const fetcher = protectedPreviewFetch(
    'https://fixture-jaemins-crafts.vercel.app',
    'private',
    async (url, options) => {
      calls++;
      assert.equal(options.redirect, 'manual');
      return new Response('', {
        status: 302,
        headers: { location: 'https://outside.invalid' },
      });
    }
  );
  assert.equal(
    (await fetcher('https://fixture-jaemins-crafts.vercel.app/rss.xml')).status,
    302
  );
  await assert.rejects(fetcher('https://outside.invalid'), /another origin/);
  assert.equal(calls, 1);
});
test('production deployment can never satisfy drill preview readiness', async () => {
  const sha = 'a'.repeat(40);
  const api = createDrillVercel({
    request: async path =>
      path.startsWith('/v6/')
        ? { deployments: [{ uid: 'one', meta: { githubCommitSha: sha } }] }
        : {
            projectId: 'prj_dTKsVA4Kn1Ae6UDA5xw3eUa3Km82',
            target: 'production',
            meta: { githubCommitSha: sha },
            url: 'one-jaemins-crafts.vercel.app',
          },
  });
  await assert.rejects(api.preview(sha), /Preview/);
});
