/* eslint-disable playwright/no-standalone-expect */
import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const runFile = promisify(execFile);

const REPO_ROOT = process.cwd();
const VERCEL_CONFIG = join(REPO_ROOT, 'vercel.json');
const COREPACK_ARGS = 'pnpm install --frozen-lockfile';
const BIN_MODE = 0o755;
const LEGACY_EXIT = 70;

function getInstallCommand(config: unknown) {
  if (
    typeof config !== 'object' ||
    config === null ||
    !('installCommand' in config) ||
    typeof config.installCommand !== 'string'
  ) {
    throw new Error('Vercel installCommand must be a string');
  }

  return config.installCommand;
}

async function writeRunner(path: string, body: string) {
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, BIN_MODE);
}

async function runInstall(binDir: string, tracePath: string) {
  const configText = await readFile(VERCEL_CONFIG, 'utf8');
  const config: unknown = JSON.parse(configText);
  const installCommand = getInstallCommand(config);

  return runFile('/bin/sh', ['-c', installCommand], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      TRACE_PATH: tracePath,
    },
  });
}

describe('Vercel install', () => {
  it('uses the pinned pnpm through Corepack', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'bendd-vercel-'));
    const binDir = join(tempRoot, 'bin');
    const tracePath = join(tempRoot, 'corepack-args');

    await mkdir(binDir);
    await writeRunner(
      join(binDir, 'corepack'),
      'printf \'%s\\n\' "$*" > "$TRACE_PATH"'
    );
    await writeRunner(join(binDir, 'pnpm'), `exit ${LEGACY_EXIT}`);

    try {
      await runInstall(binDir, tracePath);

      await expect(readFile(tracePath, 'utf8')).resolves.toBe(
        `${COREPACK_ARGS}\n`
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
