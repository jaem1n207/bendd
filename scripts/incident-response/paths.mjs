import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const CODEX_CLI_VERSION = '0.154.0';

export function isMain(moduleUrl) {
  if (!process.argv[1]) return false;
  return fileURLToPath(moduleUrl) === realpathSync(process.argv[1]);
}

export function runtimeDirectory(environment = process.env) {
  return resolve(
    environment.BENDD_INCIDENT_HOME ??
      join(
        homedir(),
        '.codex',
        'automations',
        'bendd-incident-response-support'
      )
  );
}
