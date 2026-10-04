import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { REPOSITORY } from './policy.mjs';

const exec = promisify(execFile);
const SSH_ALIAS = 'github.com-jaem1n207';

async function inspectSsh() {
  try {
    const { stdout } = await exec('ssh', ['-G', `git@${SSH_ALIAS}`], {
      timeout: 10_000,
      maxBuffer: 128 * 1024,
    });
    // Only public connection identity leaves this module, never key paths or auth data.
    const value = key =>
      stdout.match(new RegExp(`^${key}\\s+(.+)$`, 'm'))?.[1].trim();
    return { hostname: value('hostname'), user: value('user') };
  } catch {
    throw new Error(
      'GitHub SSH alias could not be verified; stop before Git operations'
    );
  }
}

export async function assertProjectRemote(remote, inspect = inspectSsh) {
  if (
    [
      `https://github.com/${REPOSITORY}`,
      `https://github.com/${REPOSITORY}.git`,
      `git@github.com:${REPOSITORY}`,
      `git@github.com:${REPOSITORY}.git`,
    ].includes(remote)
  )
    return;
  if (remote !== `git@${SSH_ALIAS}:${REPOSITORY}.git`)
    throw new Error('Unexpected project remote');
  const connection = await inspect();
  if (connection.hostname !== 'github.com' || connection.user !== 'git')
    throw new Error(
      'Unexpected project remote: SSH alias must resolve to git at github.com'
    );
}
