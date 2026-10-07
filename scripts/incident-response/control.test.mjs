import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createControl } from './control.mjs';
import {
  INCIDENT_MARKER,
  REPOSITORY,
  REQUIRED_CHECKS,
  WORKFLOW_PATH,
  assertMerge,
  incidentRunId,
  isIncident,
} from './policy.mjs';

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const NOW = '2026-10-05T00:00:00.000Z';
const ISSUE = 155;
const PR = 156;

function makeIssue() {
  return {
    number: ISSUE,
    state: 'open',
    body: `${INCIDENT_MARKER}\nhttps://github.com/${REPOSITORY}/actions/runs/100`,
    user: { login: 'github-actions[bot]' },
    assignees: [{ login: 'jaem1n207' }],
    created_at: NOW,
    html_url: `https://github.com/${REPOSITORY}/issues/${ISSUE}`,
  };
}

function makeRun() {
  return {
    id: 100,
    path: WORKFLOW_PATH,
    head_branch: 'main',
    head_sha: SHA,
    repository: { full_name: REPOSITORY },
    event: 'schedule',
    status: 'completed',
    created_at: NOW,
    conclusion: 'success',
    updated_at: NOW,
  };
}

function mergeInput() {
  return {
    sha: SHA,
    state: {
      version: 1,
      issue: ISSUE,
      phase: 'awaiting_checks',
      attempt: 1,
      pr: PR,
      head_sha: SHA,
      started_at: NOW,
      updated_at: NOW,
    },
    pr: {
      number: PR,
      head: {
        sha: SHA,
        ref: `fix/incident-${ISSUE}`,
        repo: { full_name: REPOSITORY },
      },
      base: { ref: 'main', repo: { full_name: REPOSITORY } },
      user: { login: 'jaem1n207' },
      draft: false,
      state: 'open',
      mergeable: true,
      mergeable_state: 'clean',
      body: `<!-- bendd-codex-fix:v1 issue=${ISSUE} -->`,
    },
    files: [
      {
        filename: 'src/app/api/feed/route.ts',
        status: 'modified',
        patch: '@@ -1 +1 @@\n-return old;\n+return fixed;',
      },
    ],
    checks: REQUIRED_CHECKS.map(name => ({
      name,
      head_sha: SHA,
      status: 'completed',
      conclusion: 'success',
    })),
    statuses: [
      {
        context: 'Vercel',
        state: 'success',
        target_url: 'https://vercel.com/jaemins-crafts/bendd/deployment',
      },
    ],
  };
}

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'bendd-response-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, 'config.json'),
    JSON.stringify({ repository: REPOSITORY, enabled_at: NOW })
  );
  const calls = [];
  const issue = options.issue ?? makeIssue();
  const run = options.run ?? makeRun();
  const api = async (path, method = 'GET', input) => {
    calls.push({ path, method, input });
    if (options.error) {
      throw new Error(options.error);
    }
    if (path === 'actions/workflows?per_page=100') {
      return {
        workflows: [
          {
            id: 1,
            path: WORKFLOW_PATH,
            state: options.workflowState ?? 'active',
          },
        ],
      };
    }
    if (path === 'actions/workflows/1/dispatches') {
      const error =
        typeof options.dispatchError === 'function'
          ? options.dispatchError()
          : options.dispatchError;
      if (error) throw new Error(error);
      return null;
    }
    if (path.startsWith('actions/workflows/1/runs')) {
      const items = path.includes('status=completed')
        ? options.noRun
          ? []
          : [run]
        : options.pendingRuns ?? [run];
      return { workflow_runs: items, total_count: items.length };
    }
    if (path.startsWith('issues?')) {
      return options.issues ?? [issue];
    }
    if (path === `issues/${ISSUE}`) {
      return issue;
    }
    if (path === 'actions/runs/100') {
      return run;
    }
    if (path.startsWith(`issues/${ISSUE}/comments`)) {
      return options.comments ?? [];
    }
    if (path === `pulls/${PR}`) {
      return mergeInput().pr;
    }
    if (path.startsWith(`pulls/${PR}/files`)) {
      return mergeInput().files;
    }
    if (path.startsWith(`commits/${SHA}/check-runs`)) {
      return { check_runs: mergeInput().checks };
    }
    if (path.startsWith(`commits/${SHA}/statuses`)) {
      return mergeInput().statuses;
    }
    if (path === `pulls/${PR}/merge`) {
      return { merged: true, sha: OTHER_SHA };
    }
    throw new Error(`Unexpected fake API path: ${path}`);
  };
  return {
    directory,
    calls,
    run,
    control: createControl({
      directory,
      api,
      now: () =>
        new Date(
          typeof options.now === 'function' ? options.now() : options.now ?? NOW
        ),
    }),
  };
}

test('requires the monitoring bot, marker, assignee, and exact repository run', () => {
  assert.equal(isIncident(makeIssue()), true);
  assert.equal(
    isIncident({ ...makeIssue(), user: { login: 'someone' } }),
    false
  );
  assert.equal(isIncident({ ...makeIssue(), assignees: [] }), false);
  assert.equal(isIncident({ ...makeIssue(), pull_request: {} }), false);
  assert.throws(() =>
    incidentRunId({
      ...makeIssue(),
      body: `${INCIDENT_MARKER}\nhttps://github.com/other/repo/actions/runs/100`,
    })
  );
});

test('healthy polling does not mutate GitHub or notify', async t => {
  const { control, calls } = await fixture(t, { issues: [] });
  assert.equal((await control.poll()).status, 'healthy');
  assert.equal((await control.poll()).notify, false);
  assert.ok(calls.every(call => call.method === 'GET'));
});

test('poll verifies a new incident before it becomes actionable', async t => {
  const { control, calls } = await fixture(t);
  const result = await control.poll();
  assert.equal(result.status, 'action');
  assert.equal(result.actions[0].phase, 'new');
  assert.ok(calls.some(call => call.path === 'actions/runs/100'));
});

test('one exclusive claim prevents another repair attempt', async t => {
  const { control } = await fixture(t);
  await control.claim(ISSUE);
  await assert.rejects(control.claim(ISSUE));
  const interrupted = await control.poll();
  assert.equal(interrupted.status, 'needs_action');
  assert.match(interrupted.message, /Interrupted/);
});

test('remote claim prevents repeat work after local state loss', async t => {
  const { control } = await fixture(t, {
    comments: [
      {
        user: { login: 'jaem1n207' },
        body: '<!-- bendd-codex-response:v1 issue=155 -->',
      },
    ],
  });
  assert.equal((await control.poll()).status, 'needs_action');
  await assert.rejects(control.claim(ISSUE), /already claimed/);
});

test('access denial is actionable once and never becomes healthy', async t => {
  const { control, calls } = await fixture(t, {
    error: 'GitHub HTTP 403; stop and request access',
  });
  assert.equal((await control.poll()).notify, true);
  const repeated = await control.poll();
  assert.equal(repeated.status, 'needs_action');
  assert.equal(repeated.notify, false);
  assert.equal(repeated.blocked, true);
  assert.equal(calls.length, 1);
  await control.unblock();
  assert.equal((await control.poll()).status, 'needs_action');
  assert.equal(calls.length, 2);
});

test('disabled monitoring and a stale run cannot trigger code repair', async t => {
  const disabled = await fixture(t, { workflowState: 'disabled_manually' });
  assert.equal((await disabled.control.poll()).status, 'needs_action');
  const stale = await fixture(t, { now: '2026-10-05T03:01:00.000Z' });
  assert.equal((await stale.control.poll()).status, 'needs_action');
});

test('ignores human-created issues and preserves completed incidents', async t => {
  const ignored = await fixture(t, {
    issues: [{ ...makeIssue(), user: { login: 'someone' } }],
  });
  assert.equal((await ignored.control.poll()).status, 'healthy');
  const { control } = await fixture(t);
  await control.claim(ISSUE);
  await control.checkpoint(ISSUE, {
    phase: 'completed',
    reason: 'Naturally recovered',
  });
  assert.equal((await control.poll()).status, 'healthy');
  await assert.rejects(control.checkpoint(ISSUE, { phase: 'investigating' }));
});

test('pending checks resume the original PR instead of making another', async t => {
  const { control } = await fixture(t);
  await control.claim(ISSUE);
  await control.checkpoint(ISSUE, {
    phase: 'awaiting_checks',
    pr: PR,
    head_sha: SHA,
  });
  const result = await control.poll();
  assert.equal(result.actions[0].state.pr, PR);
  await assert.rejects(
    control.checkpoint(ISSUE, {
      phase: 'awaiting_checks',
      pr: PR + 1,
      head_sha: SHA,
    }),
    /One PR/
  );
});

test('state corruption is reported without resetting the attempt', async t => {
  const { control, directory } = await fixture(t);
  await control.claim(ISSUE);
  const path = join(directory, 'state', `${ISSUE}.json`);
  await writeFile(path, '{');
  assert.equal((await control.poll()).status, 'needs_action');
  assert.equal(await readFile(path, 'utf8'), '{');
});

test('guarded merge sends the verified exact SHA and saves deployment state', async t => {
  const { control, calls } = await fixture(t);
  await control.claim(ISSUE);
  await control.checkpoint(ISSUE, {
    phase: 'awaiting_checks',
    pr: PR,
    head_sha: SHA,
  });
  await assert.rejects(control.checkpoint(ISSUE, { phase: 'awaiting_deploy' }));
  const result = await control.merge(ISSUE, SHA);
  assert.equal(result.phase, 'awaiting_deploy');
  assert.equal(result.merge_sha, OTHER_SHA);
  assert.deepEqual(calls.find(call => call.method === 'PUT').input, {
    sha: SHA,
    merge_method: 'merge',
  });
});

test('accepts only a verified app fix for the incident', () => {
  assert.equal(assertMerge(mergeInput()).sha, SHA);
});

test('permits a neutral informational check while required scans succeed', () => {
  const input = mergeInput();
  input.checks.push({
    name: 'CodeQL summary',
    head_sha: SHA,
    status: 'completed',
    conclusion: 'neutral',
  });
  assert.equal(assertMerge(input).sha, SHA);
  input.checks[0].conclusion = 'skipped';
  assert.throws(() => assertMerge(input));
});

for (const filename of [
  '.github/workflows/ci.yml',
  'next.config.mjs',
  'package.json',
  'pnpm-lock.yaml',
  'src/middleware.ts',
  'src/components/observability/ui/privacy-details.tsx',
  'src/hooks/use-auth.ts',
  'src/mdx/mdx.ts',
  'content/post.mdx',
]) {
  test(`rejects automatic merge of ${filename}`, () => {
    const input = mergeInput();
    input.files[0].filename = filename;
    assert.throws(() => assertMerge(input));
  });
}

for (const [name, mutate] of [
  [
    'changed PR head',
    input => {
      input.pr.head.sha = OTHER_SHA;
    },
  ],
  [
    'different branch',
    input => {
      input.pr.head.ref = 'fix/other';
    },
  ],
  [
    'fork PR',
    input => {
      input.pr.head.repo.full_name = 'other/bendd';
    },
  ],
  [
    'old successful check',
    input => {
      input.checks[0].head_sha = OTHER_SHA;
    },
  ],
  [
    'missing Verify',
    input => {
      input.checks.shift();
    },
  ],
  [
    'failed check',
    input => {
      input.checks[0].conclusion = 'failure';
    },
  ],
  [
    'pending check',
    input => {
      input.checks[0].status = 'in_progress';
    },
  ],
  [
    'failed Preview',
    input => {
      input.statuses[0].state = 'failure';
    },
  ],
  [
    'missing Preview',
    input => {
      input.statuses = [];
    },
  ],
  [
    'new failure after old success',
    input => {
      input.statuses.unshift({ context: 'Vercel', state: 'failure' });
    },
  ],
  [
    'file deletion',
    input => {
      input.files[0].status = 'removed';
    },
  ],
  [
    'unknown binary patch',
    input => {
      delete input.files[0].patch;
    },
  ],
  [
    'test weakening',
    input => {
      input.files[0].filename = 'tests/feed.spec.ts';
    },
  ],
  [
    'unsafe added code',
    input => {
      input.files[0].patch = '+const html = process.env.SECRET;';
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = mergeInput();
    mutate(input);
    assert.throws(() => assertMerge(input));
  });
}

test('overdue Availability requests one main workflow run without treating it as an app incident', async t => {
  const f = await fixture(t, { now: '2026-10-05T04:00:00.000Z', issues: [] });
  const result = await f.control.poll({ mode: 'dispatch' });
  assert.equal(result.status, 'waiting');
  assert.deepEqual(
    f.calls.filter(c => c.method === 'POST'),
    [
      {
        path: 'actions/workflows/1/dispatches',
        method: 'POST',
        input: { ref: 'main' },
      },
    ]
  );
  assert.ok(!f.calls.some(c => c.path.startsWith('issues')));
});

test('accepted Availability dispatch is not repeated while its run is unobserved', async t => {
  const f = await fixture(t, { now: '2026-10-05T02:00:00.000Z', issues: [] });
  await f.control.poll({ mode: 'dispatch' });
  assert.equal((await f.control.poll({ mode: 'dispatch' })).status, 'waiting');
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('queued Availability prevents another dispatch during scheduler delay', async t => {
  const queued = {
    ...makeRun(),
    id: 101,
    status: 'queued',
    conclusion: null,
    created_at: '2026-10-05T01:59:00.000Z',
  };
  const f = await fixture(t, {
    now: '2026-10-05T02:00:00.000Z',
    pendingRuns: [queued],
    issues: [],
  });
  assert.equal((await f.control.poll({ mode: 'dispatch' })).status, 'waiting');
  assert.ok(f.calls.every(c => c.method === 'GET'));
});

test('a fresh healthy Availability run keeps dispatch polling read-only', async t => {
  const f = await fixture(t, { issues: [] });
  assert.equal((await f.control.poll({ mode: 'dispatch' })).status, 'healthy');
  assert.ok(f.calls.every(c => c.method === 'GET'));
});

test('a half-hour-old healthy result does not create an extra hourly check', async t => {
  const f = await fixture(t, { now: '2026-10-05T00:30:00.000Z', issues: [] });
  const result = await f.control.poll({ mode: 'dispatch' });
  assert.equal(result.status, 'healthy');
  assert.ok(f.calls.every(call => call.method === 'GET'));
});

test('check mode never dispatches an overdue Availability run', async t => {
  const f = await fixture(t, { now: '2026-10-05T04:00:00.000Z', issues: [] });
  assert.equal(
    (await f.control.poll({ mode: 'check' })).status,
    'needs_action'
  );
  assert.ok(f.calls.every(c => c.method === 'GET'));
});

test('a missing initial run can request Availability but a failed run cannot be retried', async t => {
  const first = await fixture(t, { noRun: true, issues: [] });
  assert.equal(
    (await first.control.poll({ mode: 'dispatch' })).status,
    'waiting'
  );
  assert.equal(first.calls.filter(c => c.method === 'POST').length, 1);
  const failed = await fixture(t, {
    run: { ...makeRun(), conclusion: 'failure' },
    issues: [],
  });
  assert.equal(
    (await failed.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  assert.ok(failed.calls.every(c => c.method === 'GET'));
});

test('successive hourly ticks refresh the monitor once per tick when schedule stays absent', async t => {
  let time = '2026-10-05T02:00:00.000Z';
  const f = await fixture(t, { now: () => time, issues: [] });
  await f.control.poll({ mode: 'dispatch' });
  f.run.id = 101;
  f.run.updated_at = '2026-10-05T02:00:25.000Z';
  time = '2026-10-05T03:00:00.000Z';
  assert.equal((await f.control.poll({ mode: 'dispatch' })).status, 'waiting');
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 2);
});

test('an accepted request that never creates an observable run requires review instead of another dispatch', async t => {
  let time = '2026-10-05T02:00:00.000Z';
  const f = await fixture(t, { now: () => time, issues: [] });
  await f.control.poll({ mode: 'dispatch' });
  time = '2026-10-05T03:00:00.000Z';
  const result = await f.control.poll({ mode: 'dispatch' });
  assert.equal(result.status, 'needs_action');
  assert.match(result.message, /not observed/);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('ambiguous dispatch failure is preserved and retried only after authorized unblock', async t => {
  let error = 'GitHub command failed; stop and check authentication or network';
  let time = '2026-10-05T02:00:00.000Z';
  const f = await fixture(t, {
    now: () => time,
    dispatchError: () => error,
    issues: [],
  });
  assert.equal(
    (await f.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  error = null;
  assert.equal(
    (await f.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
  const path = join(f.directory, 'state', 'availability-refresh.json');
  const failed = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(failed.status, 'needs_action');
  assert.match(failed.error, /GitHub command failed/);
  time = '2026-10-05T03:00:00.000Z';
  await f.control.unblock();
  const authorized = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(authorized.error, failed.error);
  assert.equal(authorized.status, 'retry_authorized');
  assert.equal((await f.control.poll({ mode: 'dispatch' })).status, 'waiting');
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 2);
});

for (const status of [401, 403]) {
  test(`Availability dispatch HTTP ${status} latches without access retries`, async t => {
    const f = await fixture(t, {
      now: '2026-10-05T02:00:00.000Z',
      issues: [],
      dispatchError: `GitHub HTTP ${status}; stop and request access`,
    });
    assert.equal((await f.control.poll({ mode: 'dispatch' })).blocked, true);
    const count = f.calls.length;
    assert.equal((await f.control.poll({ mode: 'dispatch' })).blocked, true);
    assert.equal(f.calls.length, count);
  });
}

test('invalid request state is preserved through polling and unblock', async t => {
  const f = await fixture(t, { now: '2026-10-05T02:00:00.000Z', issues: [] });
  await f.control.poll({ mode: 'dispatch' });
  const path = join(f.directory, 'state', 'availability-refresh.json');
  const malformed = JSON.stringify({ version: 99, status: 'needs_action' });
  await writeFile(path, malformed);
  assert.equal(
    (await f.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  await assert.rejects(
    f.control.unblock(),
    /Invalid Availability request state/
  );
  assert.equal(await readFile(path, 'utf8'), malformed);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('a stalled queued run and future timestamp do not create more workflows', async t => {
  const queued = { ...makeRun(), id: 101, status: 'queued', conclusion: null };
  const f = await fixture(t, {
    now: '2026-10-05T04:00:00.000Z',
    pendingRuns: [queued],
    issues: [],
  });
  assert.equal(
    (await f.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  assert.ok(f.calls.every(c => c.method === 'GET'));
  const future = await fixture(t, {
    now: '2026-10-04T23:00:00.000Z',
    issues: [],
  });
  assert.equal(
    (await future.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  assert.ok(future.calls.every(c => c.method === 'GET'));
});

test('refreshing a delayed monitor does not starve an already verified incident', async t => {
  const f = await fixture(t, { now: '2026-10-05T01:00:00.000Z' });
  const result = await f.control.poll({ mode: 'dispatch' });
  assert.equal(result.status, 'action');
  assert.equal(result.actions[0].issue, ISSUE);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('unverifiable queued run metadata stops before another workflow request', async t => {
  const f = await fixture(t, {
    now: '2026-10-05T02:00:00.000Z',
    issues: [],
    pendingRuns: [
      {
        ...makeRun(),
        id: 101,
        path: '.github/workflows/other.yml',
        status: 'queued',
      },
    ],
  });
  assert.equal(
    (await f.control.poll({ mode: 'dispatch' })).status,
    'needs_action'
  );
  assert.ok(f.calls.every(c => c.method === 'GET'));
});
