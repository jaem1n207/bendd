import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createControl } from './control.mjs';
import { createWatcher, checksReadiness } from './watch.mjs';
import {
  INCIDENT_MARKER,
  REPOSITORY,
  REQUIRED_CHECKS,
  WORKFLOW_PATH,
} from './policy.mjs';
import {
  captureEvent,
  invocation,
  subscriptionEnvironment,
} from './dispatch.mjs';

const SHA = 'a'.repeat(40);
const MERGE = 'b'.repeat(40);
const NOW = '2026-10-05T00:00:00.000Z';
const ISSUE = 321;
const PR = 322;
const probe = healthy => ({
  checked_at: NOW,
  results: ['/', '/article/test', '/rss.xml', '/api/og'].map(path => ({
    path,
    ok: healthy,
    status: 200,
    type_ok: true,
    content_ok: healthy,
  })),
});
const completeChecks = () =>
  REQUIRED_CHECKS.map(name => ({
    name,
    head_sha: SHA,
    status: 'completed',
    conclusion: 'success',
  }));
const statuses = [
  {
    context: 'Vercel',
    state: 'success',
    target_url: 'https://vercel.com/jaemins-crafts/bendd/preview',
  },
];

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'bendd-watch-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = {
    version: 1,
    repository: REPOSITORY,
    enabled_at: NOW,
    project_path: '/fixture',
    dispatch_mode: 'incident-only',
    authentication: 'ChatGPT subscription',
    api_billing: false,
    response_model: 'gpt-6.1-sol',
    reasoning_effort: 'high',
    session_mode: 'new-project-thread',
    project_id: 'project-bendd',
    runtime: { codex: '/fake/codex' },
  };
  await writeFile(
    join(directory, 'config.json'),
    JSON.stringify({ ...config, ...options.config })
  );
  const issue = {
    number: ISSUE,
    state: options.closed ? 'closed' : 'open',
    user: { login: 'github-actions[bot]' },
    assignees: [{ login: 'jaem1n207' }],
    body: `${INCIDENT_MARKER}\nhttps://github.com/${REPOSITORY}/actions/runs/100`,
    created_at: NOW,
    html_url: `https://github.com/${REPOSITORY}/issues/${ISSUE}`,
    ...options.issue,
  };
  const run = {
    id: 100,
    path: WORKFLOW_PATH,
    repository: { full_name: REPOSITORY },
    head_branch: 'main',
    head_sha: SHA,
    event: 'schedule',
    conclusion: 'success',
    updated_at: NOW,
    status: 'completed',
    created_at: NOW,
    ...options.run,
  };
  const apiCalls = [];
  const comments = [];
  const api = async (path, method = 'GET', input) => {
    apiCalls.push(path);
    if (options.apiError) throw new Error(options.apiError);
    if (path === 'actions/workflows?per_page=100')
      return { workflows: [{ id: 1, path: WORKFLOW_PATH, state: 'active' }] };
    if (path === 'actions/workflows/1/dispatches' && method === 'POST')
      return null;
    if (path.startsWith('actions/workflows/1/runs?'))
      return { workflow_runs: [run], total_count: 1 };
    if (path === 'actions/runs/100') return run;
    if (path.startsWith('issues?')) return options.empty ? [] : [issue];
    if (path === `issues/${ISSUE}`) return issue;
    if (path.startsWith(`issues/${ISSUE}/comments`)) {
      if (method === 'POST') {
        const comment = {
          id: 1,
          body: input.body,
          user: { login: 'jaem1n207' },
        };
        comments.push(comment);
        return comment;
      }
      return comments;
    }
    if (path === 'issues/comments/1' && method === 'PATCH') {
      comments[0].body = input.body;
      return comments[0];
    }
    if (path === `pulls/${PR}`)
      return {
        number: PR,
        state: 'open',
        draft: false,
        mergeable: true,
        mergeable_state: 'clean',
        user: { login: 'jaem1n207' },
        body: `<!-- bendd-codex-fix:v1 issue=${ISSUE} -->`,
        head: {
          sha: SHA,
          ref: `fix/incident-${ISSUE}`,
          repo: { full_name: REPOSITORY },
        },
        base: { ref: 'main', repo: { full_name: REPOSITORY } },
      };
    if (path.startsWith(`pulls/${PR}/files`))
      return [
        {
          filename: 'src/app/api/feed/route.ts',
          status: 'modified',
          patch: '@@ -1 +1 @@\n-return old;\n+return fixed;',
        },
      ];
    if (path.startsWith(`commits/${SHA}/check-runs`))
      return { check_runs: options.checks ?? completeChecks() };
    if (path.startsWith(`commits/${SHA}/statuses`))
      return options.statuses ?? statuses;
    throw new Error(`Unexpected fake API request: ${path}`);
  };
  const control = createControl({ directory, api, now: () => new Date(NOW) });
  if (options.phase) {
    await mkdir(join(directory, 'state'), { recursive: true });
    await writeFile(
      join(directory, 'state', `${ISSUE}.json`),
      JSON.stringify({
        version: 1,
        issue: ISSUE,
        phase: options.phase,
        attempt: 1,
        pr: PR,
        head_sha: SHA,
        merge_sha: MERGE,
        started_at: NOW,
        updated_at: NOW,
        milestones: {},
      })
    );
  }
  const calls = { codex: [], auth: 0, prepare: 0, alert: 0, probe: 0 };
  const watcher = createWatcher({
    directory,
    api,
    control,
    integrity: async () => {},
    now: () => new Date(NOW),
    authenticate: async () => {
      calls.auth += 1;
      if (options.authError) throw new Error(options.authError);
    },
    prepare: async () => {
      calls.prepare += 1;
      return '/fixture/worktree';
    },
    probe: async () => {
      calls.probe += 1;
      return options.probe
        ? options.probe(calls.probe)
        : probe(options.healthy ?? false);
    },
    deployment: async () => options.deployment ?? { status: 'waiting' },
    hosting: async () => options.hosting ?? { status: 'clear', affected: [] },
    alert: async () => {
      calls.alert += 1;
    },
    runner: async input => {
      await input.onModelStart();
      calls.codex.push(input);
      if (!options.noCheckpoint)
        await control.checkpoint(ISSUE, {
          phase: options.nextPhase ?? 'completed',
        });
      return (
        options.result ?? {
          exit_code: 0,
          failed: false,
          usage: { input_tokens: 123, output_tokens: 45 },
        }
      );
    },
  });
  return { directory, watcher, calls, apiCalls, config, control, comments };
}

test('provider waiting records one GitHub explanation without marking the incident as claimed', async t => {
  const f = await fixture(t, {
    hosting: { status: 'provider_outage', affected: ['CDN'] },
  });
  await f.watcher.run();
  await f.watcher.run();
  assert.equal(f.comments.length, 1);
  assert.ok(f.comments[0].body.includes('업체 복구'));
  assert.ok(!f.comments[0].body.includes('<!-- bendd-codex-response:v1'));
  assert.equal(await f.control.readState(ISSUE), null);
  assert.equal(f.calls.codex.length, 0);
});

for (const [name, options] of [
  [
    'official hosting incident',
    { hosting: { status: 'provider_outage', affected: ['CDN'] } },
  ],
  [
    'unavailable hosting evidence',
    { hosting: { status: 'unknown', affected: [] } },
  ],
  [
    'ambiguous HTTP 500',
    {
      probe: () => ({
        ...probe(false),
        results: probe(false).results.map(row => ({ ...row, status: 500 })),
      }),
    },
  ],
  [
    'platform error response',
    {
      probe: () => ({
        ...probe(false),
        results: probe(false).results.map(row => ({
          ...row,
          provider_error: 'INTERNAL_FUNCTION_INVOCATION_FAILED',
        })),
      }),
    },
  ],
  [
    'network timeout',
    {
      probe: () => ({
        ...probe(false),
        results: probe(false).results.map(row => ({
          path: row.path,
          ok: false,
          error: 'TimeoutError',
        })),
      }),
    },
  ],
]) {
  test(`${name} defers without authentication, worktree, claim or Codex`, async t => {
    const f = await fixture(t, options);
    const result = await f.watcher.run();
    assert.equal(result.codex_invocations_this_run, 0);
    assert.equal(f.calls.auth, 0);
    assert.equal(f.calls.prepare, 0);
    assert.equal(f.calls.codex.length, 0);
    assert.equal(result.decisions[0].status, 'defer');
    await assert.rejects(
      readFile(join(f.directory, 'state', `${ISSUE}.json`)),
      { code: 'ENOENT' }
    );
  });
}

for (const [name, options] of [
  ['no incident', { empty: true }],
  ['closed incident', { closed: true }],
  ['naturally recovered incident', { healthy: true }],
  ['non-bot issue', { issue: { user: { login: 'someone' } } }],
  ['completed response', { phase: 'completed' }],
  ['response awaiting CI', { phase: 'awaiting_checks', checks: [] }],
  ['response awaiting deployment', { phase: 'awaiting_deploy' }],
]) {
  test(`${name} invokes no Codex`, async t => {
    const f = await fixture(t, options);
    const result = await f.watcher.run();
    assert.notEqual(result.status, 'needs_action');
    assert.equal(result.codex_invocations_this_run, 0);
    assert.equal(f.calls.codex.length, 0);
    assert.equal(f.calls.auth, 0);
    assert.equal(f.calls.prepare, 0);
    assert.equal(f.calls.alert, 0);
  });
}

test('verified ongoing outage dispatches once and completed state prevents duplicates', async t => {
  const f = await fixture(t);
  const first = await f.watcher.run();
  assert.equal(first.status, 'responded');
  assert.equal(first.codex_invocations_this_run, 1);
  assert.equal(f.calls.codex[0].reason, 'application_content_failure');
  assert.equal(f.calls.codex[0].action.state.phase, 'investigating');
  assert.equal((await f.control.readState(ISSUE)).phase, 'completed');
  assert.equal((await f.watcher.run()).codex_invocations_this_run, 0);
  assert.equal(f.calls.codex.length, 1);
  const saved = JSON.parse(
    await readFile(join(f.directory, 'state', 'watcher.json'))
  );
  assert.equal(saved.codex_invocations, 1);
  assert.equal(Object.values(saved.dispatches)[0].usage.input_tokens, 123);
});

test('recovery between claim and dispatch cancels the model call', async t => {
  const f = await fixture(t, { probe: number => probe(number > 1) });
  const result = await f.watcher.run();
  assert.equal(result.codex_invocations_this_run, 0);
  assert.equal(f.calls.codex.length, 0);
  assert.equal((await f.control.readState(ISSUE)).phase, 'completed');
});

test('read-only --check does not authenticate, claim, or execute a model for an outage', async t => {
  const f = await fixture(t);
  assert.equal(
    (await f.watcher.run({ dispatch: false })).codex_invocations_this_run,
    0
  );
  assert.equal(await f.control.readState(ISSUE), null);
  assert.equal(f.calls.auth, 0);
});

for (const [reason, options] of [
  ['checks_ready', { phase: 'awaiting_checks' }],
  [
    'checks_failed',
    {
      phase: 'awaiting_checks',
      checks: [
        {
          name: 'Verify',
          head_sha: SHA,
          status: 'completed',
          conclusion: 'failure',
        },
      ],
      nextPhase: 'needs_action',
    },
  ],
  ['natural_recovery', { phase: 'awaiting_checks', closed: true }],
  [
    'deployment_ready',
    { phase: 'awaiting_deploy', deployment: { status: 'ready' } },
  ],
]) {
  test(`${reason} resumes only the existing response`, async t => {
    const f = await fixture(t, options);
    const result = await f.watcher.run();
    assert.equal(result.codex_invocations_this_run, 1);
    assert.equal(f.calls.codex[0].action.state.pr, PR);
    assert.equal(f.calls.codex[0].reason, reason);
  });
}

test('failed deployment requests human review without starting a report model', async t => {
  const f = await fixture(t, {
    phase: 'awaiting_deploy',
    deployment: { status: 'failed' },
  });
  const result = await f.watcher.run();
  assert.equal(result.status, 'needs_action');
  assert.equal(result.codex_invocations_this_run, 0);
  assert.equal(f.calls.codex.length, 0);
  assert.equal(f.calls.auth, 0);
  assert.equal((await f.control.readState(ISSUE)).phase, 'awaiting_deploy');
});

test('401/403 stops without model calls and stays latched until authorized unblock', async t => {
  const f = await fixture(t, {
    apiError: 'GitHub HTTP 403; stop and request access',
  });
  assert.equal((await f.watcher.run()).status, 'needs_action');
  const reads = f.apiCalls.length;
  assert.equal((await f.watcher.run()).codex_invocations_this_run, 0);
  assert.equal(f.apiCalls.length, reads);
  assert.equal(f.calls.alert, 1);
  assert.equal(f.calls.codex.length, 0);
});

test('production authentication response is not treated as an app bug', async t => {
  const f = await fixture(t, {
    probe: () => ({
      results: [401, 200, 200, 200].map(status => ({
        status,
        ok: status === 200,
      })),
    }),
  });
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal(f.calls.codex.length, 0);
});

test('API login is rejected with no model or worktree creation', async t => {
  const f = await fixture(t, {
    authError: 'ChatGPT subscription login required; no API fallback allowed',
  });
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal(f.calls.codex.length, 0);
  assert.equal(f.calls.prepare, 0);
  assert.equal(await f.control.readState(ISSUE), null);
});

test('failed response or missing checkpoint never starts another model attempt', async t => {
  const f = await fixture(t, { noCheckpoint: true });
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal((await f.watcher.run()).codex_invocations_this_run, 0);
  assert.equal(f.calls.codex.length, 1);
});

test('live watcher lock prevents overlapping calls', async t => {
  const f = await fixture(t);
  await mkdir(join(f.directory, 'state'), { recursive: true });
  await writeFile(
    join(f.directory, 'state', 'watcher.lock'),
    JSON.stringify({ pid: process.pid })
  );
  assert.equal((await f.watcher.run()).status, 'busy');
  assert.equal(f.apiCalls.length, 0);
  assert.equal(f.calls.codex.length, 0);
});

test('corrupt operational state is preserved and notified once without inference', async t => {
  const f = await fixture(t);
  await mkdir(join(f.directory, 'state'), { recursive: true });
  const path = join(f.directory, 'state', 'watcher.json');
  await writeFile(path, 'broken-json');
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal((await f.watcher.run()).codex_invocations_this_run, 0);
  assert.equal(await readFile(path, 'utf8'), 'broken-json');
  assert.equal(f.calls.codex.length, 0);
  assert.equal(f.calls.alert, 1);
});

test('stale lock is kept for inspection and never starts a new model', async t => {
  const f = await fixture(t);
  await mkdir(join(f.directory, 'state'), { recursive: true });
  const path = join(f.directory, 'state', 'watcher.lock');
  await writeFile(path, JSON.stringify({ pid: 2147483647 }));
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal((await f.watcher.run()).codex_invocations_this_run, 0);
  assert.ok(await readFile(path, 'utf8'));
  assert.equal(f.calls.codex.length, 0);
  assert.equal(f.calls.alert, 1);
});

test('configuration cannot silently enable API billing', async t => {
  const f = await fixture(t, { config: { api_billing: true } });
  assert.equal((await f.watcher.run()).status, 'needs_action');
  assert.equal(f.apiCalls.length, 0);
  assert.equal(f.calls.codex.length, 0);
});

test('subscription invocation removes API environment variables and preserves execution rules', () => {
  assert.deepEqual(
    subscriptionEnvironment({
      HOME: '/home',
      PATH: '/bin',
      OPENAI_API_KEY: 'secret',
      OPENAI_BASE_URL: 'proxy',
      CODEX_API_KEY: 'secret',
      AZURE_OPENAI_ENDPOINT: 'proxy',
    }),
    { HOME: '/home', PATH: '/bin' }
  );
  const spec = invocation(
    {
      runtime: { codex: '/codex' },
      response_model: 'gpt-6.1-sol',
      reasoning_effort: 'high',
    },
    '/support',
    '/worktree',
    '/output'
  );
  assert.ok(spec.args.includes('forced_login_method="chatgpt"'));
  assert.ok(spec.args.includes('model_provider="openai"'));
  assert.equal(spec.args[0], 'app-server');
  assert.ok(spec.args.includes('model_reasoning_effort="high"'));
  assert.ok(spec.args.includes('approvals_reviewer="auto_review"'));
  assert.ok(
    !spec.args.some(value => /bypass|ignore-rules|danger-full/.test(value))
  );
});

test('event capture stores only identifiers and numeric usage', () => {
  const summary = { usage: {}, failed: false, thread_id: 'session' };
  captureEvent(summary, {
    method: 'item/completed',
    params: { item: { text: 'SECRET' } },
  });
  captureEvent(summary, {
    method: 'thread/tokenUsage/updated',
    params: {
      threadId: 'session',
      tokenUsage: {
        total: { inputTokens: 10, outputTokens: 5, cachedInputTokens: -1 },
      },
    },
  });
  assert.deepEqual(summary, {
    usage: { input_tokens: 10, output_tokens: 5 },
    failed: false,
    thread_id: 'session',
  });
});

test('skipped required checks cannot become ready', () => {
  const checks = completeChecks();
  checks[0].conclusion = 'skipped';
  assert.equal(checksReadiness(checks, statuses, SHA), 'failed');
});

test('scheduler fallback dispatches Availability without auth, worktree, or model calls', async t => {
  const f = await fixture(t, {
    empty: true,
    run: { updated_at: '2026-10-04T22:00:00.000Z' },
  });
  const result = await f.watcher.run();
  assert.equal(result.status, 'waiting');
  assert.equal(
    f.apiCalls.filter(p => p === 'actions/workflows/1/dispatches').length,
    1
  );
  assert.equal(f.calls.auth, 0);
  assert.equal(f.calls.prepare, 0);
  assert.equal(f.calls.codex.length, 0);
});

test('read-only watcher check leaves delayed monitoring unchanged without model or workflow dispatch', async t => {
  const f = await fixture(t, {
    empty: true,
    run: { updated_at: '2026-10-04T22:00:00.000Z' },
  });
  const result = await f.watcher.run({ dispatch: false });
  assert.equal(result.status, 'needs_action');
  assert.ok(!f.apiCalls.includes('actions/workflows/1/dispatches'));
  assert.equal(f.calls.auth, 0);
  assert.equal(f.calls.codex.length, 0);
});
