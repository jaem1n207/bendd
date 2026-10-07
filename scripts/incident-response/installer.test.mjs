import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  prepareRelease,
  activateRelease,
  rollbackRelease,
} from './install.mjs';
import { SOURCE_DIRECTORY } from './paths.mjs';
import { SOURCE_FILES, sha256, verifySnapshot } from './integrity.mjs';

const exec = promisify(execFile);

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'bendd-install-test-'));
  t.after(() =>
    rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  );
  const repository = join(root, 'repo');
  const directory = join(root, 'runtime');
  const agents = join(root, 'LaunchAgents');
  await mkdir(repository);
  const git = async (...args) =>
    (await exec('git', args, { cwd: repository })).stdout.trim();
  await git('init', '-b', 'main');
  await git('config', 'user.name', 'Fixture');
  await git('config', 'user.email', 'fixture@example.invalid');
  await git(
    'remote',
    'add',
    'origin',
    'https://github.com/jaem1n207/bendd.git'
  );
  for (const name of [...SOURCE_FILES, 'config.example.json']) {
    const path = join(repository, 'scripts', 'incident-response', name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await readFile(join(SOURCE_DIRECTORY, name)));
  }
  await git('add', '.');
  await git('-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture baseline');
  const version = await git('rev-parse', 'HEAD');
  let preflights = 0;
  const schedulerCalls = [];
  const prepare = (ref = version, extra = {}) =>
    prepareRelease({
      repository,
      directory,
      ref,
      projectPath: repository,
      runtime: {
        node: process.execPath,
        codex: '/fixture/codex',
        gh: '/fixture/gh',
      },
      preflight: async config => {
        preflights += 1;
        return { ...config, project_id: 'fixture-bendd' };
      },
      ...extra,
    });
  const scheduler = async args => {
    schedulerCalls.push(args);
    return { loaded: false };
  };
  return {
    repository,
    directory,
    agents,
    git,
    version,
    prepare,
    schedulerCalls,
    preflights: () => preflights,
    activate: version =>
      activateRelease({ directory, version, agents, scheduler }),
    rollback: () => rollbackRelease({ directory, agents, scheduler }),
  };
}

test('preparation reads the pinned commit and leaves live config/state untouched', async t => {
  const f = await fixture(t);
  await mkdir(join(f.directory, 'state'), { recursive: true });
  const state = '{"dispatches":{"321":{"status":"finished"}}}\n';
  await writeFile(join(f.directory, 'state', 'watcher.json'), state);
  await writeFile(
    join(f.repository, 'scripts', 'incident-response', 'watch.mjs'),
    'uncommitted change'
  );
  const result = await f.prepare();
  const source = join(result.path, 'scripts', 'incident-response');
  assert.match(
    await readFile(join(source, 'watch.mjs'), 'utf8'),
    /createWatcher/
  );
  await verifySnapshot(source);
  assert.equal(
    await readFile(join(f.directory, 'state', 'watcher.json'), 'utf8'),
    state
  );
  await assert.rejects(readFile(join(f.directory, 'config.json')), {
    code: 'ENOENT',
  });
  assert.equal(f.schedulerCalls.length, 0);
  assert.equal(f.preflights(), 1);
});

test('activation and rollback preserve state, results, and worktrees byte for byte', async t => {
  const f = await fixture(t);
  for (const name of ['state', 'results', 'worktrees']) {
    await mkdir(join(f.directory, name), { recursive: true });
    await writeFile(join(f.directory, name, 'sentinel'), name);
  }
  await f.prepare();
  await f.activate(f.version);
  await writeFile(
    join(f.repository, 'scripts', 'incident-response', 'README.md'),
    'new reviewed runbook'
  );
  await f.git('add', '.');
  await f.git('-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture update');
  const second = await f.git('rev-parse', 'HEAD');
  await f.prepare(second);
  await f.activate(second);
  const restored = await f.rollback();
  assert.equal(restored.version, f.version);
  const config = JSON.parse(
    await readFile(join(f.directory, 'config.json'), 'utf8')
  );
  assert.equal(config.response_model, 'gpt-6.1-sol');
  assert.equal(config.reasoning_effort, 'high');
  assert.equal(config.session_mode, 'new-project-thread');
  for (const name of ['state', 'results', 'worktrees']) {
    assert.equal(
      await readFile(join(f.directory, name, 'sentinel'), 'utf8'),
      name
    );
  }
  const plist = await readFile(
    join(f.agents, 'so.bendd.incident-watch.plist'),
    'utf8'
  );
  assert.match(plist, /BENDD_INCIDENT_HOME/);
  assert.match(plist, /<integer>12<\/integer>/);
  assert.doesNotMatch(plist, /<integer>42<\/integer>/);
});

test('an hourly release migrates the legacy cadence and can roll back without losing operational state', async t => {
  const f = await fixture(t);
  const templatePath = join(
    f.repository,
    'scripts',
    'incident-response',
    'config.example.json'
  );
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  await writeFile(
    templatePath,
    JSON.stringify({
      ...template,
      interval_minutes: 30,
      scheduler_minutes: [12, 42],
      excluded_session_ids: ['setup-chat'],
    })
  );
  await f.git('add', '.');
  await f.git(
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture legacy cadence'
  );
  const legacy = await f.git('rev-parse', 'HEAD');
  await f.prepare(legacy);
  await f.activate(legacy);
  const before = await readFile(join(f.directory, 'config.json'), 'utf8');
  const oldConfig = JSON.parse(before);
  await mkdir(join(f.directory, 'state'), { recursive: true });
  const state = '{"dispatches":{"321":{"status":"finished"}}}';
  await writeFile(join(f.directory, 'state', 'sentinel'), state);
  await writeFile(
    templatePath,
    JSON.stringify({
      ...template,
      interval_minutes: 60,
      scheduler_minutes: [12],
    })
  );
  await f.git('add', '.');
  await f.git(
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture hourly cadence'
  );
  const hourly = await f.git('rev-parse', 'HEAD');
  const prepared = await f.prepare(hourly);
  const config = JSON.parse(
    await readFile(
      join(prepared.path, 'scripts', 'incident-response', 'config.json'),
      'utf8'
    )
  );
  assert.equal(config.interval_minutes, 60);
  assert.deepEqual(config.scheduler_minutes, [12]);
  assert.equal(config.enabled_at, oldConfig.enabled_at);
  assert.deepEqual(config.excluded_session_ids, oldConfig.excluded_session_ids);
  assert.equal(
    await readFile(join(f.directory, 'config.json'), 'utf8'),
    before
  );
  await f.activate(hourly);
  const plist = await readFile(
    join(f.agents, 'so.bendd.incident-watch.plist'),
    'utf8'
  );
  assert.match(plist, /<integer>12<\/integer>/);
  assert.doesNotMatch(plist, /<integer>42<\/integer>/);
  const restored = await f.rollback();
  assert.equal(restored.version, legacy);
  assert.equal(
    await readFile(join(f.directory, 'config.json'), 'utf8'),
    before
  );
  assert.equal(
    await readFile(join(f.directory, 'state', 'sentinel'), 'utf8'),
    state
  );
  assert.match(
    await readFile(join(f.agents, 'so.bendd.incident-watch.plist'), 'utf8'),
    /<integer>42<\/integer>/
  );
});

test('preparation rejects an unrecognized cadence before migration', async t => {
  const f = await fixture(t);
  const configFile = join(f.repository, 'invalid-cadence.json');
  await writeFile(
    configFile,
    JSON.stringify({ interval_minutes: 30, scheduler_minutes: [12] })
  );
  await assert.rejects(
    f.prepare(f.version, { configFile }),
    /subscription configuration/
  );
  assert.equal(f.preflights(), 0);
});

test('active or stale watcher locks prevent activation without removing the lock', async t => {
  const f = await fixture(t);
  await f.prepare();
  await mkdir(join(f.directory, 'state'), { recursive: true });
  const lock = join(f.directory, 'state', 'watcher.lock');
  await writeFile(lock, '{"pid":12345}');
  await assert.rejects(f.activate(f.version), /running or interrupted/);
  assert.equal(await readFile(lock, 'utf8'), '{"pid":12345}');
  assert.equal(f.schedulerCalls.length, 0);
});

test('tampered snapshots cannot be activated', async t => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  await writeFile(
    join(prepared.path, 'scripts', 'incident-response', 'watch.mjs'),
    'tampered'
  );
  await assert.rejects(f.activate(f.version), /Trusted source changed/);
  assert.equal(f.schedulerCalls.length, 0);
});

test('the known pre-hosting v2 snapshot remains verifiable for rollback', async t => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  const source = join(prepared.path, 'scripts', 'incident-response');
  const path = join(source, 'manifest.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  delete manifest.sha256['hosting.mjs'];
  await rm(join(source, 'hosting.mjs'));
  await writeFile(path, JSON.stringify(manifest));
  await verifySnapshot(source);
  await writeFile(join(source, 'watch.mjs'), 'tampered');
  await assert.rejects(verifySnapshot(source), /Trusted source changed/);
});

test('preparation rejects branch names and altered subscription/model settings', async t => {
  const f = await fixture(t);
  await assert.rejects(f.prepare('main'), /full commit/);
  const configFile = join(f.repository, 'candidate.json');
  await writeFile(configFile, '{"response_model":"other-model"}');
  await assert.rejects(
    f.prepare(f.version, { configFile }),
    /subscription configuration/
  );
  assert.equal(f.preflights(), 0);
});

test('preparation refuses a different remote repository', async t => {
  const f = await fixture(t);
  await f.git(
    'remote',
    'set-url',
    'origin',
    'https://github.com/example/other.git'
  );
  await assert.rejects(f.prepare(), /Unexpected project remote/);
  assert.equal(f.preflights(), 0);
});

test('repeating preparation is idempotent and keeps its enabled_at timestamp', async t => {
  const f = await fixture(t);
  const first = await f.prepare();
  const bytes = await readFile(
    join(first.path, 'scripts', 'incident-response', 'config.json')
  );
  const second = await f.prepare();
  assert.equal(first.path, second.path);
  assert.deepEqual(
    await readFile(
      join(second.path, 'scripts', 'incident-response', 'config.json')
    ),
    bytes
  );
});

test('the installed watcher verifies its snapshot and makes zero model calls when healthy', async t => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  await f.activate(f.version);
  const { createWatcher } = await import(
    pathToFileURL(
      join(prepared.path, 'scripts', 'incident-response', 'watch.mjs')
    ).href
  );
  let calls = 0;
  const watcher = createWatcher({
    directory: f.directory,
    control: {
      poll: async () => ({ status: 'healthy', message: 'fixture healthy' }),
    },
    runner: async () => {
      calls += 1;
      throw new Error('Unexpected model call');
    },
    alert: async () => {},
  });
  const result = await watcher.run();
  assert.equal(result.status, 'healthy');
  assert.equal(result.codex_invocations_this_run, 0);
  assert.equal(calls, 0);
});

test('the actual installed symlink entrypoint executes a healthy check without credentials or model calls', async t => {
  const f = await fixture(t);
  await writeFile(
    join(f.repository, 'scripts', 'incident-response', 'control.mjs'),
    `
export const githubApi = async () => { throw new Error('Unexpected network request'); };
export const createControl = () => ({
  poll: async () => ({ status: 'healthy', message: 'offline CLI check' }),
});
`
  );
  await f.git('add', '.');
  await f.git(
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture offline control'
  );
  const version = await f.git('rev-parse', 'HEAD');
  await f.prepare(version);
  await f.activate(version);
  const result = await exec(
    process.execPath,
    [
      join(f.directory, 'current', 'scripts', 'incident-response', 'watch.mjs'),
      '--check',
    ],
    { env: { ...process.env, BENDD_INCIDENT_HOME: f.directory } }
  );
  const check = JSON.parse(result.stdout);
  assert.equal(check.status, 'healthy');
  assert.equal(check.codex_invocations_this_run, 0);
  assert.equal(check.codex_invocations_total, 0);
});

test('access denial during preflight stops without a prepared version or scheduler changes', async t => {
  const f = await fixture(t);
  await assert.rejects(
    f.prepare(f.version, {
      preflight: async () => {
        throw new Error('HTTP 403; stop and request access');
      },
    }),
    /HTTP 403/
  );
  await assert.rejects(readFile(join(f.directory, 'installation.json')), {
    code: 'ENOENT',
  });
  assert.equal(f.schedulerCalls.length, 0);
});

test('failed scheduler registration leaves an explicit recovery record and permits rollback', async t => {
  const f = await fixture(t);
  await f.prepare();
  await f.activate(f.version);
  await writeFile(
    join(f.repository, 'scripts', 'incident-response', 'README.md'),
    'updated'
  );
  await f.git('add', '.');
  await f.git(
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'fixture second version'
  );
  const second = await f.git('rev-parse', 'HEAD');
  await f.prepare(second);
  await assert.rejects(
    activateRelease({
      directory: f.directory,
      version: second,
      agents: f.agents,
      scheduler: async args => {
        if (args[0] === 'bootstrap') throw new Error('registration rejected');
        return { loaded: false };
      },
    }),
    /registration rejected/
  );
  const recovery = JSON.parse(
    await readFile(join(f.directory, 'activation.json'), 'utf8')
  );
  assert.equal(recovery.status, 'needs_action');
  assert.equal(recovery.from, f.version);
  const restored = await f.rollback();
  assert.equal(restored.version, f.version);
});

test('first adoption can roll back to the legacy scheduler without copying authentication or state', async t => {
  const f = await fixture(t);
  await mkdir(f.directory, { recursive: true });
  const template = JSON.parse(
    await readFile(join(SOURCE_DIRECTORY, 'config.example.json'), 'utf8')
  );
  const config = {
    ...template,
    project_path: f.repository,
    project_id: 'fixture-bendd',
    enabled_at: '2026-10-01T00:00:00Z',
    runtime: {
      node: process.execPath,
      codex: '/fixture/codex',
      gh: '/fixture/gh',
    },
  };
  const names = [
    'policy.mjs',
    'control.mjs',
    'check-availability.mjs',
    'report.mjs',
    'dispatch.mjs',
    'app-server.mjs',
    'vercel-read.mjs',
    'watch.mjs',
    'README.md',
    'POSTMORTEM.md',
    'config.json',
    'so.bendd.incident-watch.plist',
  ];
  const hashes = {};
  const original = JSON.stringify(config, null, 2) + '\n';
  for (const name of names) {
    const bytes = name === 'config.json' ? original : `legacy fixture: ${name}`;
    await writeFile(join(f.directory, name), bytes);
    hashes[name] = sha256(bytes);
  }
  await writeFile(
    join(f.directory, 'manifest.json'),
    JSON.stringify({ version: 1, sha256: hashes })
  );
  await writeFile(
    join(f.directory, 'auth.json'),
    'fixture authentication must not be copied'
  );
  await f.prepare();
  const active = await f.activate(f.version);
  assert.equal(active.previous, 'legacy');
  await assert.rejects(
    readFile(join(f.directory, 'legacy-backup', 'auth.json')),
    { code: 'ENOENT' }
  );
  const restored = await f.rollback();
  assert.equal(restored.version, 'legacy');
  assert.equal(
    await readFile(join(f.directory, 'config.json'), 'utf8'),
    original
  );
  assert.equal(
    await readFile(join(f.agents, 'so.bendd.incident-watch.plist'), 'utf8'),
    'legacy fixture: so.bendd.incident-watch.plist'
  );
});
