import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSubscription, verifyCodexToolkit } from './dispatch.mjs';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CODEX_CLI_VERSION } from './paths.mjs';

const config = { runtime: { codex: '/fixture/codex' } };

test('missing execution toolkit stops before login and any model request', async () => {
  const calls = [];
  await assert.rejects(
    requireSubscription(
      config,
      async (exe, args) => {
        calls.push(args);
        return { stdout: `codex-cli ${CODEX_CLI_VERSION}`, stderr: '' };
      },
      async () => {
        throw Error('Missing codex-code-mode-host');
      }
    ),
    /Missing codex-code-mode-host/
  );
  assert.deepEqual(calls, [['--version']]);
});

test('complete package validation rejects a bare binary or missing code-mode host', async t => {
  const root = await mkdtemp(join(tmpdir(), 'bendd-toolkit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'bin'));
  const executable = join(root, 'bin/codex');
  await writeFile(executable, 'fixture');
  await assert.rejects(
    verifyCodexToolkit(executable),
    /Complete Codex CLI package/
  );
  await writeFile(
    join(root, 'codex-package.json'),
    JSON.stringify({
      layoutVersion: 1,
      version: CODEX_CLI_VERSION,
      entrypoint: 'bin/codex',
    })
  );
  await assert.rejects(verifyCodexToolkit(executable), /codex-code-mode-host/);
  const host = join(root, 'bin/codex-code-mode-host');
  await writeFile(host, 'fixture');
  await chmod(host, 0o700);
  assert.equal(
    (await verifyCodexToolkit(executable)).version,
    CODEX_CLI_VERSION
  );
  await chmod(host, 0o600);
  await assert.rejects(verifyCodexToolkit(executable), /codex-code-mode-host/);
});

test('subscription authentication checks the supported schema version before login', async () => {
  const calls = [];
  await requireSubscription(
    config,
    async (executable, args) => {
      calls.push({ executable, args });
      return args[0] === '--version'
        ? { stdout: `codex-cli ${CODEX_CLI_VERSION}\n`, stderr: '' }
        : { stdout: '', stderr: 'Logged in using ChatGPT\n' };
    },
    async () => {}
  );
  assert.deepEqual(
    calls.map(call => call.args),
    [['--version'], ['login', 'status']]
  );
});

test('a changed CLI stops before subscription login or a model request', async () => {
  const calls = [];
  await assert.rejects(
    requireSubscription(config, async (executable, args) => {
      calls.push(args);
      return { stdout: 'codex-cli 999.0.0', stderr: '' };
    }),
    /schema version changed/
  );
  assert.deepEqual(calls, [['--version']]);
});

test('API login is rejected after version verification without fallback', async () => {
  await assert.rejects(
    requireSubscription(
      config,
      async (executable, args) =>
        args[0] === '--version'
          ? { stdout: `codex-cli ${CODEX_CLI_VERSION}\n`, stderr: '' }
          : { stdout: 'Logged in using an API key', stderr: '' },
      async () => {}
    ),
    /ChatGPT subscription login required/
  );
});
