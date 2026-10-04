import assert from 'node:assert/strict';
import test from 'node:test';
import { createDrillVercel, protectedPreviewFetch } from './drill-access.mjs';
import {
  assertDrillMerge,
  assertBeforeModelResume,
  assertAuthorizedModelResume,
} from './drill.mjs';
import { REQUIRED_CHECKS } from './policy.mjs';

test('human-authorized model resume keeps the same drill and refuses a PR, successful turn or repeat', () => {
  const directory = '/fixture/drill';
  const record = {
    version: 1,
    directory,
    id: 'availability-123',
    status: 'needs_action',
    model_calls: 1,
    issue: 160,
    access_revoked: true,
    broken_sha: 'a'.repeat(40),
    base_branch: 'drill/availability-123',
    fix_branch: 'fix/drill-availability-123',
    worktree: directory + '/fix',
    model_result: {
      exit_code: 1,
      status: 'failed',
      model: 'gpt-6.1-sol',
      reasoning_effort: 'high',
      thread_id: 'first-failed',
    },
  };
  assert.doesNotThrow(() => assertAuthorizedModelResume(record, directory));
  for (const change of [
    { pr: 161 },
    { authorized_retry_at: 'now' },
    { access_revoked: false },
    { model_calls: 2 },
    { model_result: { ...record.model_result, status: 'completed' } },
  ])
    assert.throws(
      () => assertAuthorizedModelResume({ ...record, ...change }, directory),
      /one explicitly authorized/
    );
});

test('pre-model propagation resume rejects access denial, model use, issues and repeated resume', () => {
  const directory = '/fixture/drill';
  const record = {
    version: 1,
    directory,
    id: 'availability-123',
    status: 'needs_action',
    message: 'Preview redirects to protected or unexpected content; stop',
    model_calls: 0,
    access_revoked: true,
    broken_sha: 'a'.repeat(40),
    base_branch: 'drill/availability-123',
    fix_branch: 'fix/drill-availability-123',
    worktree: directory + '/fix',
  };
  assert.doesNotThrow(() => assertBeforeModelResume(record, directory));
  for (const change of [
    { message: 'Preview HTTP 403' },
    { model_calls: 1 },
    { issue: 12 },
    { pr: 13 },
    { access_revoked: false },
    { resumed_at: '2026-10-05T00:00:00Z' },
  ])
    assert.throws(
      () => assertBeforeModelResume({ ...record, ...change }, directory),
      /no access denial or model retry/
    );
});

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
  let propagated = false;
  const api = createDrillVercel({
    propagate: async () => {
      propagated = true;
    },
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
      assert.equal(propagated, true);
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
