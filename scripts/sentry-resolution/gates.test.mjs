import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGitHub, createSentry } from './api.mjs';
import { CHECK_NAMES, resolveIssues, verifyProduction } from './gates.mjs';

const SHA = 'b'.repeat(40);
const FIX = 'a'.repeat(40);
const NOW = Date.parse('2026-10-16T08:00:00Z');
const DEPLOYMENT = {
  id: 42,
  sha: SHA,
  url: 'https://bendd.me',
  deploymentUrl: 'https://bendd-test-jaemins-crafts.vercel.app',
};
const PLAN = {
  version: 1,
  issues: [
    {
      id: '7789135895',
      shortId: 'BENDD-3',
      fixCommit: FIX,
      observedThrough: '2026-10-16T07:18:28.001Z',
    },
    {
      id: '7789135912',
      shortId: 'BENDD-4',
      fixCommit: FIX,
      observedThrough: '2026-10-16T07:18:28.001Z',
    },
  ],
};

function harness() {
  const writes = [];
  const states = new Map(
    PLAN.issues.map(issue => [
      issue.id,
      {
        id: issue.id,
        shortId: issue.shortId,
        status: 'unresolved',
        lastSeen: '2026-10-13T02:51:19Z',
        project: { id: '4512194092859392', slug: 'bendd' },
      },
    ])
  );
  return {
    sha: SHA,
    plan: structuredClone(PLAN),
    now: () => NOW,
    writes,
    states,
    github: { production: async () => structuredClone(DEPLOYMENT) },
    containsFix: async commit => commit === FIX,
    check: async () => CHECK_NAMES.map(name => ({ name, passed: true })),
    sentry: {
      get: async id => structuredClone(states.get(id)),
      resolve: async id => {
        writes.push(id);
        states.get(id).status = 'resolved';
      },
    },
    save: async () => {},
  };
}

async function verified(context) {
  return verifyProduction(context);
}

test('only resolves the explicit issues after deployment, regression, and fix ancestry pass', async () => {
  const context = harness();
  const report = await verified(context);
  const result = await resolveIssues({ ...context, report });
  assert.deepEqual(
    context.writes,
    PLAN.issues.map(issue => issue.id)
  );
  assert.ok(result.issues.every(issue => issue.status === 'resolved'));
});

for (const check of CHECK_NAMES) {
  test(`${check} failure prevents a verification report and any issue write`, async () => {
    const context = harness();
    context.check = async () =>
      CHECK_NAMES.map(name => ({ name, passed: name !== check }));
    await assert.rejects(verified(context), /regression/i);
    assert.deepEqual(context.writes, []);
  });
}

for (const checks of [
  [],
  [{ name: 'made-up', passed: true }],
  CHECK_NAMES.map(name => ({ name, passed: 'true' })),
]) {
  test('missing, unknown, or non-boolean regression results fail closed', async () => {
    const context = harness();
    context.check = async () => checks;
    await assert.rejects(verified(context), /regression/i);
  });
}

test('a production deployment without the fix cannot pass', async () => {
  const context = harness();
  context.containsFix = async () => false;
  await assert.rejects(verified(context), /fix commit/i);
});

test('deployment changes during browser verification invalidate the result', async () => {
  const context = harness();
  let calls = 0;
  context.github.production = async () => ({
    ...DEPLOYMENT,
    id: calls++ ? 43 : 42,
  });
  await assert.rejects(verified(context), /deployment changed/i);
});

for (const alter of [
  report => {
    report.sha = FIX;
  },
  report => {
    report.deployment.id = 999;
  },
  report => {
    report.checkedAt = new Date(NOW - 31 * 60_000).toISOString();
  },
  report => {
    report.checkedAt = new Date(NOW + 60_000).toISOString();
  },
  report => {
    report.checks.pop();
  },
  report => {
    report.checks[0].passed = false;
  },
  report => {
    report.planHash = 'other';
  },
]) {
  test('stale, altered, incomplete, or wrong-commit evidence never resolves an issue', async () => {
    const context = harness();
    const report = await verified(context);
    alter(report);
    await assert.rejects(resolveIssues({ ...context, report }));
    assert.deepEqual(context.writes, []);
  });
}

for (const alter of [
  issue => {
    issue.project.id = 'other';
  },
  issue => {
    issue.shortId = 'BENDD-99';
  },
  issue => {
    issue.id = '111';
  },
  issue => {
    issue.lastSeen = '2026-10-16T07:19:00Z';
  },
  issue => {
    issue.lastSeen = 'unknown';
  },
  issue => {
    issue.status = 'ignored';
  },
]) {
  test('every issue is checked before the first write; identity, recurrence, and archive changes block all writes', async () => {
    const context = harness();
    const report = await verified(context);
    alter(context.states.get(PLAN.issues[1].id));
    await assert.rejects(resolveIssues({ ...context, report }));
    assert.deepEqual(context.writes, []);
  });
}

test('report persistence failure prevents all writes', async () => {
  const context = harness();
  const report = await verified(context);
  context.save = async () => {
    throw new Error('disk');
  };
  await assert.rejects(resolveIssues({ ...context, report }), /disk/);
  assert.deepEqual(context.writes, []);
});

test('partial API failure is retryable without resolving an already resolved issue again', async () => {
  const context = harness();
  const report = await verified(context);
  const resolve = context.sentry.resolve;
  context.sentry.resolve = async id => {
    if (id === PLAN.issues[1].id) {
      throw new Error('API');
    }
    await resolve(id);
  };
  await assert.rejects(resolveIssues({ ...context, report }), /API/);
  context.sentry.resolve = resolve;
  await resolveIssues({ ...context, report });
  assert.deepEqual(
    context.writes,
    PLAN.issues.map(issue => issue.id)
  );
});

test('a mutation must be read back as resolved', async () => {
  const context = harness();
  const report = await verified(context);
  context.sentry.resolve = async () => {};
  await assert.rejects(resolveIssues({ ...context, report }), /read.back/i);
});

test('invalid or duplicate issue plans never begin verification', async () => {
  for (const plan of [
    { version: 1, issues: [] },
    { ...PLAN, issues: [PLAN.issues[0], PLAN.issues[0]] },
    { ...PLAN, issues: [{ ...PLAN.issues[0], id: '../wrong' }] },
    { ...PLAN, issues: [{ ...PLAN.issues[0], fixCommit: 'main' }] },
  ]) {
    const context = harness();
    await assert.rejects(verifyProduction({ ...context, plan }), /plan/i);
  }
});

function ghFixture(change = () => {}) {
  const routes = {
    '/git/ref/heads/main': { object: { sha: SHA } },
    '/actions/workflows/ci.yml/runs': {
      workflow_runs: [
        {
          head_sha: SHA,
          head_branch: 'main',
          event: 'push',
          status: 'completed',
          conclusion: 'success',
        },
      ],
    },
    '/deployments': [
      {
        id: 42,
        sha: SHA,
        environment: 'Production',
        creator: { login: 'vercel[bot]' },
      },
    ],
    '/deployments/42/statuses': [
      {
        state: 'success',
        environment: 'Production',
        environment_url: DEPLOYMENT.deploymentUrl,
        creator: { login: 'vercel[bot]' },
      },
    ],
  };
  change(routes);
  return async (url, options) => {
    assert.equal(url.origin, 'https://api.github.com');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer github-token');
    return Response.json(
      routes[url.pathname.replace('/repos/jaem1n207/bendd', '')]
    );
  };
}

test('GitHub driver binds latest main, successful CI, and Vercel Production deployment to one SHA', async () => {
  const github = createGitHub('github-token', ghFixture());
  assert.deepEqual(await github.production(SHA), DEPLOYMENT);
});

for (const change of [
  routes => {
    routes['/git/ref/heads/main'].object.sha = FIX;
  },
  routes => {
    routes['/actions/workflows/ci.yml/runs'].workflow_runs[0].conclusion =
      'failure';
  },
  routes => {
    routes['/actions/workflows/ci.yml/runs'].workflow_runs[0].event =
      'pull_request';
  },
  routes => {
    routes['/deployments'][0].environment = 'Preview';
  },
  routes => {
    routes['/deployments'][0].sha = FIX;
  },
  routes => {
    routes['/deployments'][0].creator.login = 'someone';
  },
  routes => {
    routes['/deployments/42/statuses'][0].state = 'failure';
  },
  routes => {
    routes['/deployments/42/statuses'][0].creator.login = 'someone';
  },
  routes => {
    routes['/deployments/42/statuses'][0].environment_url = 'https://evil.test';
  },
  routes => {
    routes['/deployments/42/statuses'][0].environment_url =
      'https://bendd-test-jaemins-crafts.vercel.app@evil.test';
  },
]) {
  test('GitHub driver rejects untrusted, failed, preview, stale, or unrelated deployments', async () => {
    const github = createGitHub('github-token', ghFixture(change));
    await assert.rejects(github.production(SHA));
  });
}

test('Sentry driver uses only the fixed organization endpoint and minimal resolution body', async () => {
  const calls = [];
  const sentry = createSentry('issue-token', async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ id: '7789135895', status: 'resolved' });
  });
  await sentry.resolve('7789135895');
  assert.equal(
    calls[0].url,
    'https://us.sentry.io/api/0/organizations/jaemin/issues/7789135895/'
  );
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].headers.Authorization, 'Bearer issue-token');
  assert.deepEqual(JSON.parse(calls[0].body), { status: 'resolved' });
  assert.equal(calls[0].redirect, 'error');
  await assert.rejects(sentry.get('../other'));
});

test('missing credentials and API failures are not treated as success and never leak response bodies', async () => {
  assert.throws(() => createSentry(''), /SENTRY_ISSUE_TOKEN/);
  assert.throws(() => createGitHub(''), /GH_TOKEN/);
  const sentry = createSentry(
    'secret',
    async () => new Response('secret-response', { status: 403 })
  );
  await assert.rejects(
    sentry.resolve('7789135895'),
    error => /403/.test(error.message) && !/secret/.test(error.message)
  );
});

test('main/deployment changes after issue preflight prevent the first mutation', async () => {
  const context = harness();
  const report = await verified(context);
  let calls = 0;
  context.github.production = async () => ({
    ...DEPLOYMENT,
    id: calls++ ? 43 : 42,
  });
  await assert.rejects(
    resolveIssues({ ...context, report }),
    /deployment changed/i
  );
  assert.deepEqual(context.writes, []);
});

test('a new occurrence between preflight and mutation is left unresolved', async () => {
  const context = harness();
  const report = await verified(context);
  const get = context.sentry.get;
  let calls = 0;
  context.sentry.get = async id => {
    const issue = await get(id);
    if (++calls > PLAN.issues.length) {
      issue.lastSeen = '2026-10-16T07:19:00Z';
    }
    return issue;
  };
  await assert.rejects(
    resolveIssues({ ...context, report }),
    /recurrence changed/i
  );
  assert.deepEqual(context.writes, []);
});

test('issue lookup errors never permit a partial preflight mutation', async () => {
  const context = harness();
  const report = await verified(context);
  const get = context.sentry.get;
  context.sentry.get = async id => {
    if (id === PLAN.issues[1].id) {
      throw new Error('HTTP 403');
    }
    return get(id);
  };
  await assert.rejects(resolveIssues({ ...context, report }), /403/);
  assert.deepEqual(context.writes, []);
});

test('a changed resolution plan invalidates previously passed browser evidence', async () => {
  const context = harness();
  const report = await verified(context);
  context.plan.issues[0].observedThrough = '2026-10-16T07:20:00Z';
  await assert.rejects(
    resolveIssues({ ...context, report }),
    /verification report/
  );
  assert.deepEqual(context.writes, []);
});
