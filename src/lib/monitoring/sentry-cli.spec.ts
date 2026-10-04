// @vitest-environment node
import { spawnSync } from 'node:child_process';

import { describe, expect, test } from 'vitest';

const CALL_COUNT = 12;
const EXIT_SUCCESS = 0;
const RUN_CLI = `
  import { createRequire } from 'node:module';
  import { pathToFileURL } from 'node:url';
  const require = createRequire(process.cwd() + '/package.json');
  const nextRequire = createRequire(require.resolve('@sentry/nextjs/config'));
  const pluginRequire = createRequire(nextRequire.resolve('@sentry/bundler-plugins/core'));
  const cliPath = pluginRequire.resolve('sentry');
  const { createSentrySDK } = process.env.TEST_CLI_FORMAT === 'esm'
    ? await import(pathToFileURL(cliPath.replace(/cjs$/, 'mjs')).href)
    : pluginRequire('sentry');
  const sdk = createSentrySDK({ token: 'test-token', org: 'test-org', project: 'test-project' });
  const initial = process.listenerCount('SIGTERM');
  let completed = 0;
  for (let index = 0; index < ${CALL_COUNT}; index++) {
    try {
      await sdk.run('nonexistent-regression-command');
    } catch {
      // Invalid commands may reject or return an error result.
    }
    completed++;
  }
  console.log(JSON.stringify({ initial, final: process.listenerCount('SIGTERM'), completed }));
`;

describe('Sentry CLI 라이브러리 수명 주기', () => {
  for (const format of ['cjs', 'esm']) {
    test(`${format}: 반복 호출이 SIGTERM 리스너를 남기지 않는다`, () => {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) => !key.startsWith('SENTRY_') && !key.startsWith('VERCEL')
        )
      );
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', RUN_CLI],
        {
          cwd: process.cwd(),
          env: {
            ...env,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: '1',
            SENTRY_CLI_NO_TELEMETRY: '1',
            SENTRY_CLI_NO_UPDATE_CHECK: '1',
            TEST_CLI_FORMAT: format,
          },
          encoding: 'utf8',
          timeout: 10_000,
        }
      );

      expect(result.status).toBe(EXIT_SUCCESS);
      expect(JSON.parse(result.stdout)).toEqual({
        initial: 0,
        final: 0,
        completed: CALL_COUNT,
      });
      expect(result.stderr).not.toContain('MaxListenersExceededWarning');
    });
  }
});
