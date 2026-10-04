import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSubscription } from './dispatch.mjs';
import { CODEX_CLI_VERSION } from './paths.mjs';

const config = { runtime: { codex: '/fixture/codex' } };

test('subscription authentication checks the supported schema version before login', async () => {
  const calls = [];
  await requireSubscription(config, async (executable, args) => {
    calls.push({ executable, args });
    return args[0] === '--version'
      ? { stdout: `codex-cli ${CODEX_CLI_VERSION}\n`, stderr: '' }
      : { stdout: '', stderr: 'Logged in using ChatGPT\n' };
  });
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
    requireSubscription(config, async (executable, args) =>
      args[0] === '--version'
        ? { stdout: `codex-cli ${CODEX_CLI_VERSION}\n`, stderr: '' }
        : { stdout: 'Logged in using an API key', stderr: '' }
    ),
    /ChatGPT subscription login required/
  );
});
