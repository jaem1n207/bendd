import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { CHECKS, checkAvailability } from '../check-availability.mjs';
import { createGitHub, INCIDENT_MARKER, RECOVERY_MARKER } from './github.mjs';
import { runMonitor } from './monitor.mjs';
import { advanceState, MAX_GAP_MS, parseState } from './state.mjs';

const START = Date.parse('2026-10-05T00:00:00Z');
const INTERVAL = 30 * 60 * 1000;
function report(failed = [], offset = 0) {
  return {
    checked_at: new Date(START + offset).toISOString(),
    results: CHECKS.map(check => ({
      path: check.path.split('?')[0],
      ok: !failed.includes(check.path.split('?')[0]),
      status: 200,
      elapsed_ms: 10,
    })),
  };
}
function harness() {
  let previous = null;
  let incident = null;
  const calls = [];
  return {
    calls,
    github: {
      loadState: async () => previous,
      findIncident: async () => incident,
      openIncident: async body => {
        calls.push(['outage', body]);
        incident = { number: 42 };
      },
      recoverIncident: async (issue, body) => {
        calls.push(['recovered', body]);
        incident = null;
      },
    },
    save: async ({ state }) => {
      previous = state;
    },
    runUrl: 'https://github.com/jaem1n207/bendd/actions/runs/123',
  };
}

for (const path of CHECKS.map(check => check.path.split('?')[0])) {
  test(`${path}: healthy → first failure → confirmed outage → ongoing → recovery only sends twice`, async () => {
    const context = harness();
    const transitions = [];
    const inputs = [[], [path], [path], [path], [], []];
    for (const [index, failed] of inputs.entries()) {
      const result = await runMonitor({
        ...context,
        check: async () => report(failed, index * INTERVAL),
      });
      transitions.push(result.transition);
    }
    assert.deepEqual(transitions, [
      'healthy',
      'suspected',
      'outage',
      'ongoing',
      'recovered',
      'healthy',
    ]);
    assert.deepEqual(
      context.calls.map(call => call[0]),
      ['outage', 'recovered']
    );
    assert.match(context.calls[0][1], /점검 실행과 상세 결과/);
  });
}

test('different failing routes do not count as two consecutive failures', () => {
  const first = advanceState(null, report(['/']));
  const second = advanceState(first, report(['/rss.xml'], INTERVAL));
  assert.equal(second.failures['/'], 0);
  assert.equal(second.failures['/rss.xml'], 1);
});

test('success resets a suspected failure and new outage can alert after recovery', async () => {
  const context = harness();
  for (const [index, failed] of [
    ['/'],
    [],
    ['/'],
    ['/'],
    [],
    ['/'],
    ['/'],
  ].entries()) {
    await runMonitor({
      ...context,
      check: async () => report(failed, index * INTERVAL),
    });
  }
  assert.deepEqual(
    context.calls.map(call => call[0]),
    ['outage', 'recovered', 'outage']
  );
});

test('30-minute cadence preserves the streak after one delayed interval', () => {
  const first = advanceState(null, report(['/']));
  const second = advanceState(first, report(['/'], INTERVAL * 2));
  assert.equal(second.failures['/'], 2);
});

test('expired or future state starts a new failure streak', () => {
  const first = advanceState(null, report(['/']));
  assert.equal(
    advanceState(first, report(['/'], MAX_GAP_MS + 1)).failures['/'],
    1
  );
  assert.equal(advanceState(first, report(['/'], -1)).failures['/'], 1);
});

test('missing history still allows recovery of an existing incident', async () => {
  const context = harness();
  context.github.findIncident = async () => ({ number: 42 });
  const result = await runMonitor({ ...context, check: async () => report() });
  assert.equal(result.transition, 'recovered');
});

test('corrupt state/report fail before notifying', async () => {
  assert.throws(() => parseState({ version: 2 }), /Invalid/);
  assert.throws(
    () => parseState({ ...advanceState(null, report()), failures: {} }),
    /Invalid/
  );
  assert.throws(
    () => advanceState(null, { ...report(), results: [] }),
    /Invalid/
  );
  const context = harness();
  context.github.loadState = async () => ({ version: 1 });
  await assert.rejects(
    runMonitor({ ...context, check: async () => report(['/']) }),
    /Invalid/
  );
  assert.deepEqual(context.calls, []);
});

test('save failure prevents notification, API failure preserves state for retry', async () => {
  const context = harness();
  await runMonitor({ ...context, check: async () => report(['/']) });
  await assert.rejects(
    runMonitor({
      ...context,
      check: async () => report(['/'], INTERVAL),
      save: async () => {
        throw new Error('disk');
      },
    }),
    /disk/
  );
  assert.deepEqual(context.calls, []);
  context.github.openIncident = async () => {
    throw new Error('API');
  };
  await assert.rejects(
    runMonitor({ ...context, check: async () => report(['/'], INTERVAL) }),
    /API/
  );
  let opened = 0;
  context.github.openIncident = async () => {
    opened += 1;
  };
  await runMonitor({
    ...context,
    check: async () => report(['/'], INTERVAL * 2),
  });
  assert.equal(opened, 1);
});

function responseFor(url) {
  const path = url.pathname;
  if (path === '/api/og') {
    return new Response(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), {
      headers: { 'content-type': 'image/png' },
    });
  }
  const check = CHECKS.find(item => item.path.split('?')[0] === path);
  return new Response(check.marker, {
    headers: {
      'content-type': check.type === 'xml' ? 'application/xml' : check.type,
    },
  });
}

test('checker validates all markers and PNG signature', async () => {
  const result = await checkAvailability(
    'https://example.test',
    async (url, options) => {
      assert.equal(options.headers.Authorization, undefined);
      assert.ok(options.signal instanceof AbortSignal);
      return responseFor(url);
    }
  );
  assert.equal(result.results.length, 4);
  assert.ok(result.results.every(item => item.ok));
});

for (const [name, fetcher] of [
  [
    'HTTP error',
    async url =>
      new Response(await responseFor(url).arrayBuffer(), {
        status: 503,
        headers: responseFor(url).headers,
      }),
  ],
  [
    'wrong content type',
    async url =>
      new Response(await responseFor(url).arrayBuffer(), {
        headers: { 'content-type': 'text/plain' },
      }),
  ],
  [
    'wrong content',
    async url =>
      new Response('error page', { headers: responseFor(url).headers }),
  ],
  [
    'network timeout',
    async () => {
      throw new DOMException('timeout', 'TimeoutError');
    },
  ],
  [
    'body timeout',
    async url => {
      const response = responseFor(url);
      response.arrayBuffer = async () => {
        throw new DOMException('timeout', 'TimeoutError');
      };
      return response;
    },
  ],
]) {
  test(`checker catches ${name}`, async () => {
    const result = await checkAvailability('https://example.test', fetcher);
    assert.ok(result.results.every(item => !item.ok));
    assert.ok(result.results.every(item => !('message' in item)));
  });
}

test('GitHub driver paginates and ignores PR/human marker lookalikes', async () => {
  const issue = { number: 42, body: INCIDENT_MARKER };
  const driver = createGitHub('jaem1n207/bendd', '123', async args => {
    assert.match(args[1], /creator=github-actions%5Bbot%5D/);
    if (args[1].endsWith('&page=1')) {
      return JSON.stringify(
        Array.from({ length: 100 }, () => ({
          pull_request: {},
          body: INCIDENT_MARKER,
        }))
      );
    }
    return JSON.stringify([issue]);
  });
  assert.deepEqual(await driver.findIncident(), issue);
});

test('GitHub driver refuses duplicate incidents and API access failures', async () => {
  const duplicates = createGitHub('jaem1n207/bendd', '123', async () =>
    JSON.stringify([
      { number: 1, body: INCIDENT_MARKER },
      { number: 2, body: INCIDENT_MARKER },
    ])
  );
  await assert.rejects(duplicates.findIncident(), /Multiple/);
  const denied = createGitHub('jaem1n207/bendd', '123', async () => {
    throw new Error('403');
  });
  await assert.rejects(denied.loadState(), /403/);
  assert.throws(() => createGitHub('../evil', '123'), /Invalid/);
});

test('new workflow, deleted/expired artifacts reset history without guessing older state', async () => {
  for (const runs of [[], [{ id: 122, event: 'schedule' }]]) {
    const driver = createGitHub('jaem1n207/bendd', '123', async args =>
      JSON.stringify(
        args[1].includes('/artifacts')
          ? { artifacts: [{ name: 'availability-state', expired: true }] }
          : { workflow_runs: runs }
      )
    );
    assert.equal(await driver.loadState(), null);
  }
});

test('driver reads most recent completed run including failed notification and cleans temp files', async () => {
  let directory;
  const expected = advanceState(null, report(['/']));
  const driver = createGitHub('jaem1n207/bendd', '123', async args => {
    if (args[0] === 'run') {
      assert.equal(args[2], '122');
      directory = args.at(-1);
      await writeFile(join(directory, 'state.json'), JSON.stringify(expected));
      return '';
    }
    if (args[1].includes('/artifacts')) {
      return JSON.stringify({
        artifacts: [{ name: 'availability-state', expired: false }],
      });
    }
    return JSON.stringify({
      workflow_runs: [
        { id: 123, event: 'schedule' },
        { id: 122, event: 'schedule', conclusion: 'failure' },
      ],
    });
  });
  assert.deepEqual(await driver.loadState(), expected);
  await assert.rejects(readFile(join(directory, 'state.json')), /ENOENT/);
});

test('recovery comment is idempotent after partial API failure', async () => {
  const writes = [];
  let commented = false;
  let attempts = 0;
  const driver = createGitHub('jaem1n207/bendd', '123', async (args, body) => {
    const method = args[args.indexOf('--method') + 1];
    if (method === 'GET') {
      return JSON.stringify(
        commented
          ? [{ body: RECOVERY_MARKER, user: { login: 'github-actions[bot]' } }]
          : []
      );
    }
    writes.push([method, body]);
    if (method === 'POST') {
      commented = true;
    }
    if (method === 'PATCH' && attempts++ === 0) {
      throw new Error('API');
    }
    return '{}';
  });
  await assert.rejects(driver.recoverIncident({ number: 42 }, '복구'), /API/);
  await driver.recoverIncident({ number: 42 }, '복구');
  assert.equal(writes.filter(item => item[0] === 'POST').length, 1);
  assert.equal(writes.filter(item => item[0] === 'PATCH').length, 2);
});

test('outage issue assigns maintainer and uses stable marker', async () => {
  const driver = createGitHub('jaem1n207/bendd', '123', async (args, body) => {
    assert.equal(args[args.indexOf('--method') + 1], 'POST');
    assert.deepEqual(body.assignees, ['jaem1n207']);
    assert.match(body.body, /bendd-availability-incident:v1/);
    return '{"number":42}';
  });
  assert.equal((await driver.openIncident('장애')).number, 42);
});
