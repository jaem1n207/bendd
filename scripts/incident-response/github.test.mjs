import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);
const client = new URL('./control.mjs', import.meta.url).href;
const SECRET = 'ghp_fixture_never_write_this_to_diagnostics';

async function fixture(t, steps) {
  const root = await mkdtemp(join(tmpdir(), 'bendd-github-driver-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bin'));
  await writeFile(join(root, 'steps.json'), JSON.stringify(steps));
  await writeFile(
    join(root, 'bin', 'gh'),
    `#!${process.execPath}
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const root = process.env.FIXTURE_ROOT;
const path = join(root, 'calls.json');
let calls = [];
try { calls = JSON.parse(readFileSync(path, 'utf8')); } catch {}
const steps = JSON.parse(readFileSync(join(root, 'steps.json'), 'utf8'));
const step = steps[Math.min(calls.length, steps.length - 1)];
calls.push(process.argv.slice(2));
writeFileSync(path, JSON.stringify(calls));
if (process.argv.includes('--input')) readFileSync(0, 'utf8');
process.stdout.write(step.stdout ?? '');
process.stderr.write(step.stderr ?? '');
process.exit(step.code ?? 0);
`,
    { mode: 0o755 }
  );
  const call = async (method = 'GET') => {
    const { stdout, stderr } = await exec(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
const {githubApi} = await import(${JSON.stringify(client)});
try {
  const data = await githubApi(${JSON.stringify(method === 'POST' ? 'actions/workflows/1/dispatches' : 'actions/workflows?per_page=100')}, ${JSON.stringify(method)}, ${method === 'POST' ? JSON.stringify({ ref: 'main', secret: SECRET }) : 'undefined'});
  console.log(JSON.stringify({ok:true,data}));
} catch (error) {
  console.log(JSON.stringify({ok:false,message:error.message,diagnostic:error.diagnostic}));
}
`,
      ],
      {
        env: {
          ...process.env,
          PATH: join(root, 'bin') + ':' + process.env.PATH,
          BENDD_INCIDENT_HOME: root,
          FIXTURE_ROOT: root,
        },
      }
    );
    return { ...JSON.parse(stdout), stderr };
  };
  return {
    root,
    call,
    calls: async () =>
      JSON.parse(await readFile(join(root, 'calls.json'), 'utf8')),
    log: () => readFile(join(root, 'state', 'github-events.jsonl'), 'utf8'),
  };
}

test('temporary DNS read failure retries and returns the successful response', async t => {
  const f = await fixture(t, [
    { code: 1, stderr: 'dial tcp: lookup api.github.com: no such host' },
    { stdout: '{"workflows":[]}' },
  ]);
  const result = await f.call();
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { workflows: [] });
  assert.equal((await f.calls()).length, 2);
  const events = (await f.log()).trim().split('\n').map(JSON.parse);
  assert.equal(
    events.find(item => item.event === 'github.failure').category,
    'dns'
  );
  assert.equal(events.at(-1).event, 'github.success');
  assert.equal(events.at(-1).attempt, 2);
});

test('exhausted server errors retain safe HTTP diagnostics after bounded reads', async t => {
  const f = await fixture(t, [
    {
      code: 1,
      stderr: `gh: unavailable (HTTP 503); Authorization: Bearer ${SECRET}`,
    },
  ]);
  const result = await f.call();
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostic,
    'The failed request must retain structured diagnostics'
  );
  assert.equal(result.diagnostic.http_status, 503);
  assert.equal(result.diagnostic.category, 'server');
  assert.equal((await f.calls()).length, 3);
  const log = await f.log();
  assert.ok(!log.includes(SECRET));
  assert.ok(!log.includes('Authorization'));
  assert.ok(!result.message.includes(SECRET));
  assert.equal(typeof result.diagnostic.duration_ms, 'number');
});

test('a timed out workflow POST is never repeated and its body stays out of logs', async t => {
  const f = await fixture(t, [
    { code: 1, stderr: `context deadline exceeded; token=${SECRET}` },
  ]);
  const result = await f.call('POST');
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostic,
    'The ambiguous POST must retain structured diagnostics'
  );
  assert.equal(result.diagnostic.category, 'timeout');
  assert.equal((await f.calls()).length, 1);
  assert.ok(!JSON.stringify(result).includes(SECRET));
  assert.ok(!(await f.log()).includes(SECRET));
});

for (const status of [401, 403]) {
  test(`HTTP ${status} stops immediately with access diagnostics`, async t => {
    const f = await fixture(t, [
      { code: 1, stderr: `gh: access denied (HTTP ${status})` },
    ]);
    const result = await f.call();
    assert.ok(
      result.diagnostic,
      'Access denial must retain structured diagnostics'
    );
    assert.equal(result.diagnostic.category, 'access');
    assert.equal(result.diagnostic.http_status, status);
    assert.equal((await f.calls()).length, 1);
  });
}

test('successful workflow request asks for an identifiable GitHub run receipt', async t => {
  const receipt = {
    workflow_run_id: 200,
    run_url: 'https://api.github.com/repos/jaem1n207/bendd/actions/runs/200',
    html_url: 'https://github.com/jaem1n207/bendd/actions/runs/200',
  };
  const f = await fixture(t, [{ stdout: JSON.stringify(receipt) }]);
  assert.deepEqual((await f.call('POST')).data, receipt);
  assert.ok((await f.calls())[0].includes('X-GitHub-Api-Version: 2026-03-10'));
  assert.ok(!(await f.log()).includes(SECRET));
});

test('missing CLI authentication is identified without copying the login prompt', async t => {
  const f = await fixture(t, [
    {
      code: 4,
      stderr: `To get started with GitHub CLI, please run: gh auth login. ${SECRET}`,
    },
  ]);
  const result = await f.call();
  assert.equal(result.diagnostic.category, 'access');
  assert.equal(result.diagnostic.http_status, null);
  assert.equal((await f.calls()).length, 1);
  assert.ok(!(await f.log()).includes(SECRET));
});

test('diagnostic rotation retains only two backups with private file permissions', async t => {
  const f = await fixture(t, [{ stdout: '{"workflows":[]}' }]);
  await mkdir(join(f.root, 'state'));
  const path = join(f.root, 'state', 'github-events.jsonl');
  const old = '{"event":"fixture.previous"}\n';
  for (let index = 0; index < 3; index += 1) {
    await writeFile(path, old.repeat(Math.floor((1024 * 1024) / old.length)), {
      mode: 0o600,
    });
    assert.equal((await f.call()).ok, true);
  }
  assert.deepEqual((await readdir(join(f.root, 'state'))).sort(), [
    'github-events.jsonl',
    'github-events.jsonl.1',
    'github-events.jsonl.2',
  ]);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.ok((await stat(path + '.2')).size <= 1024 * 1024);
  assert.ok((await stat(path)).size < 1024 * 1024);
});

test('unavailable diagnostic file cannot lose an accepted POST receipt or leak its body', async t => {
  const receipt = { workflow_run_id: 200 };
  const f = await fixture(t, [{ stdout: JSON.stringify(receipt) }]);
  await mkdir(join(f.root, 'state', 'github-events.jsonl'), {
    recursive: true,
  });
  const result = await f.call('POST');
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, receipt);
  assert.equal((await f.calls()).length, 1);
  assert.match(result.stderr, /log_unavailable/);
  assert.ok(!result.stderr.includes(SECRET));
});
