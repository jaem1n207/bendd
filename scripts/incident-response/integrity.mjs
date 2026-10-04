import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SOURCE_DIRECTORY, runtimeDirectory } from './paths.mjs';

export const COMMIT = /^[a-f0-9]{40}$/;
export const SOURCE_FILES = [
  'policy.mjs',
  'repository.mjs',
  'control.mjs',
  'report.mjs',
  'dispatch.mjs',
  'app-server.mjs',
  'vercel-read.mjs',
  'watch.mjs',
  'paths.mjs',
  'integrity.mjs',
  'README.md',
  'POSTMORTEM.md',
  '../check-availability.mjs',
];
export const SNAPSHOT_FILES = [
  ...SOURCE_FILES,
  'config.json',
  'launch-agent.plist',
];

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function verifySnapshot(sourceDirectory) {
  const manifest = JSON.parse(
    await readFile(join(sourceDirectory, 'manifest.json'), 'utf8')
  );
  if (
    manifest.version !== 2 ||
    !COMMIT.test(manifest.commit ?? '') ||
    !manifest.sha256 ||
    Object.keys(manifest.sha256).length !== SNAPSHOT_FILES.length
  ) {
    throw new Error('Invalid pinned incident-response snapshot');
  }
  for (const name of SNAPSHOT_FILES) {
    if (
      sha256(await readFile(join(sourceDirectory, name))) !==
      manifest.sha256[name]
    ) {
      throw new Error(
        `Trusted source changed: ${name}; manual review required`
      );
    }
  }
  return manifest;
}

export async function verifyInstallation(directory = runtimeDirectory()) {
  const manifest = await verifySnapshot(SOURCE_DIRECTORY);
  if (
    sha256(await readFile(join(directory, 'config.json'))) !==
    manifest.sha256['config.json']
  ) {
    throw new Error(
      'Trusted configuration changed; prepare a reviewed version'
    );
  }
  return manifest;
}
