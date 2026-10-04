import { constants } from 'node:fs';
import {
  access,
  chmod,
  mkdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import {
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { promisify } from 'node:util';
import {
  createIncidentSession,
  initializeClient,
  invocation,
  requireSubscription,
  verifyCodexToolkit,
} from './dispatch.mjs';
import { openAppServer } from './app-server.mjs';
import {
  COMMIT,
  SOURCE_FILES,
  SNAPSHOT_FILES,
  sha256,
  verifySnapshot,
} from './integrity.mjs';
import { CODEX_CLI_VERSION, isMain, runtimeDirectory } from './paths.mjs';
import { REPOSITORY, WORKFLOW_PATH } from './policy.mjs';
import { createVercelReader } from './vercel-read.mjs';
import { assertProjectRemote } from './repository.mjs';

const exec = promisify(execFile);
const LABEL = 'so.bendd.incident-watch';
const LEGACY_FILES = [
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

async function optionalFile(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function json(path) {
  const bytes = await optionalFile(path);
  return bytes ? JSON.parse(bytes.toString()) : null;
}

async function privateWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, bytes, { mode: 0o600 });
  await rename(temporary, path);
  await chmod(path, 0o600);
}

async function writeJson(path, value) {
  await privateWrite(path, JSON.stringify(value, null, 2) + '\n');
}

function assertConfig(config, { projectRequired = true } = {}) {
  if (
    config.repository !== REPOSITORY ||
    config.version !== 1 ||
    config.dispatch_mode !== 'incident-only' ||
    config.authentication !== 'ChatGPT subscription' ||
    config.api_billing !== false ||
    config.response_model !== 'gpt-6.1-sol' ||
    config.reasoning_effort !== 'high' ||
    config.session_mode !== 'new-project-thread' ||
    config.interval_minutes !== 30 ||
    config.scheduler_label !== LABEL ||
    JSON.stringify(config.scheduler_minutes) !== '[12,42]' ||
    !isAbsolute(config.project_path ?? '') ||
    !Number.isFinite(Date.parse(config.enabled_at)) ||
    (projectRequired &&
      (typeof config.project_id !== 'string' || !config.project_id)) ||
    !Array.isArray(config.excluded_session_ids) ||
    config.excluded_session_ids.some(
      value => typeof value !== 'string' || !value
    ) ||
    ['node', 'codex', 'gh'].some(
      name => !isAbsolute(config.runtime?.[name] ?? '')
    )
  ) {
    throw new Error('Invalid incident-only subscription configuration');
  }
}

export async function executable(name, environment = process.env) {
  for (const directory of (environment.PATH ?? '').split(delimiter)) {
    if (!isAbsolute(directory)) continue;
    const path = join(directory, name);
    try {
      await access(path, constants.X_OK);
      return await realpath(path);
    } catch (error) {
      if (!['ENOENT', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error(
    `Required executable missing: ${name}; install it explicitly`
  );
}

function escapeXml(value) {
  return String(value).replace(
    /[<>&"']/g,
    character =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]
  );
}

export function launchAgent(config, directory) {
  const path = [
    ...new Set([
      ...Object.values(config.runtime).map(value => dirname(value)),
      '/opt/homebrew/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ]),
  ].join(delimiter);
  const string = value => `<string>${escapeXml(value)}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key>${string(LABEL)}
<key>ProgramArguments</key><array>
${string(config.runtime.node)}
${string(join(directory, 'current', 'scripts', 'incident-response', 'watch.mjs'))}
</array>
<key>WorkingDirectory</key>${string(directory)}
<key>RunAtLoad</key><true/>
<key>StartCalendarInterval</key><array>
<dict><key>Minute</key><integer>12</integer></dict>
<dict><key>Minute</key><integer>42</integer></dict>
</array>
<key>EnvironmentVariables</key><dict>
<key>PATH</key>${string(path)}
<key>BENDD_INCIDENT_HOME</key>${string(directory)}
</dict>
<key>Umask</key><integer>63</integer>
<key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key>${string(join(directory, 'state', 'scheduler.log'))}
<key>StandardErrorPath</key>${string(join(directory, 'state', 'scheduler-error.log'))}
</dict></plist>\n`;
}

async function command(executable, args, cwd) {
  try {
    return (
      await exec(executable, args, {
        cwd,
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      })
    ).stdout;
  } catch (error) {
    const status = error.stderr?.match(/\b(401|403)\b/)?.[1];
    throw new Error(
      status
        ? `HTTP ${status}; stop and request access`
        : 'Prerequisite command failed; stop without retrying'
    );
  }
}

async function validateCli(config) {
  if (!/^24\./.test(process.versions.node))
    throw new Error('Node 24 is required');
  const version = (await command(config.runtime.codex, ['--version'])).trim();
  if (version !== `codex-cli ${CODEX_CLI_VERSION}`)
    throw new Error(
      `Codex CLI ${CODEX_CLI_VERSION} schema is required; review upgrades first`
    );
  await verifyCodexToolkit(config.runtime.codex);
}

export async function preflightCandidate(
  config,
  directory,
  {
    validate = validateCli,
    authenticate = requireSubscription,
    clientFactory = openAppServer,
    github,
    production = async () => createVercelReader().current(),
  } = {}
) {
  assertConfig(config, { projectRequired: false });
  await validate(config);
  await authenticate(config);
  const client = clientFactory(
    invocation(config, directory, config.project_path)
  );
  try {
    await initializeClient(client);
    const matches = [];
    let cursor;
    for (let page = 0; page < 20; page += 1) {
      const result = await client.request('project/list', {
        cursor,
        limit: 100,
      });
      if (!Array.isArray(result.data))
        throw new Error('Invalid Codex project list');
      matches.push(
        ...result.data.filter(
          project =>
            project.name === 'bendd' &&
            project.roots?.some(root => root.path === config.project_path)
        )
      );
      cursor = result.nextCursor;
      if (!cursor) break;
      if (page === 19) throw new Error('Codex project pagination limit');
    }
    if (matches.length !== 1)
      throw new Error(
        'Register exactly one bendd project with the expected path in Codex'
      );
    config = { ...config, project_id: matches[0].id };
    // No turn/start, naming, stored test thread, or public incident is created.
    await createIncidentSession(client, {
      config,
      worktree: config.project_path,
      action: { issue: 1, phase: 'new' },
      forbiddenIds: config.excluded_session_ids,
      ephemeral: true,
    });
  } finally {
    await client.close();
  }
  const api =
    github ??
    (async path => JSON.parse(await command(config.runtime.gh, ['api', path])));
  const repo = await api(`repos/${REPOSITORY}`);
  if (repo.full_name !== REPOSITORY || repo.default_branch !== 'main')
    throw new Error('GitHub repository identity mismatch');
  const workflow = await api(
    `repos/${REPOSITORY}/actions/workflows/availability.yml`
  );
  if (workflow.path !== WORKFLOW_PATH || workflow.state !== 'active')
    throw new Error('Availability workflow is not active');
  await production();
  return config;
}

async function validateRepository(repository) {
  const remote = (
    await command('git', ['remote', 'get-url', 'origin'], repository)
  ).trim();
  await assertProjectRemote(remote);
}

export async function prepareRelease({
  repository = process.cwd(),
  directory = runtimeDirectory(),
  ref,
  projectPath,
  configFile,
  runtime,
  preflight = preflightCandidate,
}) {
  if (!COMMIT.test(ref ?? ''))
    throw new Error(
      'Use a full commit SHA; branch names are not pinned versions'
    );
  repository = await realpath(repository);
  directory = resolve(directory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  directory = await realpath(directory);
  const location = relative(repository, directory);
  if (!location.startsWith('..') && !isAbsolute(location))
    throw new Error('Operational data must stay outside the repository');
  await validateRepository(repository);
  const commit = (
    await command(
      'git',
      ['rev-parse', '--verify', `${ref}^{commit}`],
      repository
    )
  ).trim();
  if (commit !== ref) throw new Error('Commit identity mismatch');
  const show = path =>
    command('git', ['show', `${commit}:${path}`], repository);
  const template = JSON.parse(
    await show('scripts/incident-response/config.example.json')
  );
  const destination = join(directory, 'releases', commit);
  const stagedSource = join(destination, 'scripts', 'incident-response');
  const hasPrepared = await optionalFile(join(stagedSource, 'manifest.json'));
  if (hasPrepared) await verifySnapshot(stagedSource);
  const saved = configFile
    ? await json(configFile)
    : (await json(join(directory, 'config.json'))) ??
      (hasPrepared ? await json(join(stagedSource, 'config.json')) : null);
  if (configFile && !saved)
    throw new Error('Requested local config file is missing');
  const common = (
    await command(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      repository
    )
  ).trim();
  const project = resolve(
    projectPath ?? saved?.project_path ?? dirname(common)
  );
  await validateRepository(project);
  const inProject = relative(await realpath(project), directory);
  if (!inProject.startsWith('..') && !isAbsolute(inProject))
    throw new Error('Operational data must stay outside the repository');
  const imported = Object.fromEntries(
    Object.keys(template)
      .filter(key => saved && key in saved)
      .map(key => [key, saved[key]])
  );
  let config = {
    ...template,
    ...imported,
    project_path: project,
    enabled_at: saved?.enabled_at ?? new Date().toISOString(),
    runtime: runtime ?? {
      node: process.execPath,
      codex: await executable('codex'),
      gh: await executable('gh'),
    },
  };
  assertConfig(config, { projectRequired: false });
  config = await preflight(config, directory);
  assertConfig(config);
  const releases = join(directory, 'releases');
  await mkdir(releases, { recursive: true, mode: 0o700 });
  if (
    await optionalFile(
      join(destination, 'scripts', 'incident-response', 'manifest.json')
    )
  ) {
    const manifest = await verifySnapshot(
      join(destination, 'scripts', 'incident-response')
    );
    if (
      manifest.sha256['config.json'] !==
      sha256(JSON.stringify(config, null, 2) + '\n')
    )
      throw new Error(
        'Pinned version already prepared with different local settings; do not overwrite'
      );
    return {
      status: 'prepared',
      version: commit,
      path: destination,
      codex_model_calls: 0,
    };
  }
  const temporary = join(releases, `.${commit}.${process.pid}.tmp`);
  try {
    const source = join(temporary, 'scripts', 'incident-response');
    for (const name of SOURCE_FILES) {
      await privateWrite(
        join(source, name),
        await show(
          name === '../check-availability.mjs'
            ? 'scripts/check-availability.mjs'
            : `scripts/incident-response/${name}`
        )
      );
    }
    await writeJson(join(source, 'config.json'), config);
    await privateWrite(
      join(source, 'launch-agent.plist'),
      launchAgent(config, directory)
    );
    const hashes = {};
    for (const name of SNAPSHOT_FILES)
      hashes[name] = sha256(await readFile(join(source, name)));
    await writeJson(join(source, 'manifest.json'), {
      version: 2,
      commit,
      sha256: hashes,
    });
    await verifySnapshot(source);
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return {
    status: 'prepared',
    version: commit,
    path: destination,
    codex_model_calls: 0,
  };
}

async function maintenance(directory, action) {
  const path = join(directory, 'state', 'watcher.lock');
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(
      path,
      JSON.stringify({ pid: process.pid, maintenance: true }),
      {
        flag: 'wx',
        mode: 0o600,
      }
    );
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Watcher is running or interrupted; inspect it without removing its lock'
      );
    throw error;
  }
  try {
    return await action();
  } finally {
    await rm(path);
  }
}

async function schedulerCommand(args) {
  try {
    const result = await exec('/bin/launchctl', args, {
      timeout: 15_000,
      maxBuffer: 128 * 1024,
    });
    return { loaded: true, output: result.stdout };
  } catch (error) {
    // Only the documented absent-service error permits a first installation.
    if (
      args[0] === 'print' &&
      /Could not find service/.test(error.stderr ?? '')
    )
      return { loaded: false };
    throw new Error(
      'launchd operation failed; installation paused, inspect before rollback'
    );
  }
}

async function saveLegacy(directory) {
  if (!(await optionalFile(join(directory, 'config.json')))) return null;
  const manifest = await json(join(directory, 'manifest.json'));
  if (
    manifest?.version !== 1 ||
    !manifest.sha256 ||
    Object.keys(manifest.sha256).some(name => !LEGACY_FILES.includes(name)) ||
    LEGACY_FILES.some(name => !manifest.sha256[name])
  )
    throw new Error(
      'Unknown existing installation; preserve it and inspect before adoption'
    );
  const legacy = join(directory, 'legacy-backup');
  if (await optionalFile(join(legacy, 'manifest.json')))
    throw new Error(
      'Legacy backup already exists without installation metadata'
    );
  const verified = [];
  for (const name of LEGACY_FILES) {
    const bytes = await readFile(join(directory, name));
    if (sha256(bytes) !== manifest.sha256[name])
      throw new Error('Legacy source changed; stop before adoption');
    verified.push([name, bytes]);
  }
  const temporary = join(directory, `.legacy-backup.${process.pid}.tmp`);
  try {
    for (const [name, bytes] of verified)
      await privateWrite(join(temporary, name), bytes);
    await writeJson(join(temporary, 'manifest.json'), manifest);
    await rename(temporary, legacy);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return 'legacy';
}

async function versionFiles(directory, version) {
  if (version === 'legacy') {
    const backup = join(directory, 'legacy-backup');
    const manifest = await json(join(backup, 'manifest.json'));
    if (!manifest || LEGACY_FILES.some(name => !manifest.sha256?.[name]))
      throw new Error('Missing verified legacy backup');
    for (const name of LEGACY_FILES) {
      if (sha256(await readFile(join(backup, name))) !== manifest.sha256[name])
        throw new Error('Legacy backup changed');
      if (
        !['config.json', 'so.bendd.incident-watch.plist'].includes(name) &&
        sha256(await readFile(join(directory, name))) !== manifest.sha256[name]
      )
        throw new Error('Legacy runtime source changed; stop before rollback');
    }
    return {
      config: await readFile(join(backup, 'config.json')),
      plist: await readFile(join(backup, 'so.bendd.incident-watch.plist')),
      target: null,
    };
  }
  if (!COMMIT.test(version ?? ''))
    throw new Error('Use a prepared full commit SHA');
  const target = join(directory, 'releases', version);
  const source = join(target, 'scripts', 'incident-response');
  const manifest = await verifySnapshot(source);
  if (manifest.commit !== version) throw new Error('Prepared commit mismatch');
  const config = await readFile(join(source, 'config.json'));
  assertConfig(JSON.parse(config));
  return {
    config,
    plist: await readFile(join(source, 'launch-agent.plist')),
    target,
  };
}

export async function activateRelease({
  directory = runtimeDirectory(),
  version,
  agents = join(homedir(), 'Library', 'LaunchAgents'),
  scheduler = schedulerCommand,
}) {
  directory = resolve(directory);
  const files = await versionFiles(directory, version);
  const config = JSON.parse(files.config);
  const domain = `gui/${process.getuid()}`;
  const installed = join(agents, `${LABEL}.plist`);
  return maintenance(directory, async () => {
    const previous = await json(join(directory, 'installation.json'));
    if (previous?.version === version)
      throw new Error(
        'Version already active; do not restart an existing responder'
      );
    if (previous) await installationStatus(directory);
    const legacy = previous ? null : await saveLegacy(directory);
    const transaction = {
      from: previous?.version ?? legacy,
      to: version,
      started_at: new Date().toISOString(),
      status: 'pending',
    };
    await writeJson(join(directory, 'activation.json'), transaction);
    try {
      const job = await scheduler(['print', `${domain}/${LABEL}`]);
      if (job.loaded) await scheduler(['bootout', `${domain}/${LABEL}`]);
      // Only config/source selection and scheduler files change. Operational records are not copied.
      await privateWrite(join(directory, 'config.json'), files.config);
      if (files.target) {
        const temporary = join(directory, `.current.${process.pid}.tmp`);
        await symlink(relative(directory, files.target), temporary);
        await rename(temporary, join(directory, 'current'));
      } else {
        await rm(join(directory, 'current'), { force: true });
      }
      await privateWrite(installed, files.plist);
      const record = {
        version,
        previous: previous?.version ?? legacy,
        activated_at: new Date().toISOString(),
        scheduler: 'pending',
      };
      await writeJson(join(directory, 'installation.json'), record);
      await scheduler(['bootstrap', domain, installed]);
      await writeJson(join(directory, 'installation.json'), {
        ...record,
        scheduler: 'registered',
      });
      await writeJson(join(directory, 'activation.json'), {
        ...transaction,
        status: 'completed',
      });
      return {
        status: 'activated',
        version,
        previous: record.previous,
        project_id: config.project_id,
      };
    } catch (error) {
      await writeJson(join(directory, 'activation.json'), {
        ...transaction,
        status: 'needs_action',
      });
      throw error;
    }
  });
}

export async function rollbackRelease(options = {}) {
  const directory = options.directory ?? runtimeDirectory();
  const installed = await json(join(directory, 'installation.json'));
  const activation = await json(join(directory, 'activation.json'));
  const version =
    options.version ??
    (activation?.status === 'needs_action'
      ? activation.from
      : installed?.previous);
  if (!version)
    throw new Error(
      'No previous installed version; choose a prepared version explicitly'
    );
  return activateRelease({ ...options, directory, version });
}

export async function installationStatus(directory = runtimeDirectory()) {
  const installed = await json(join(directory, 'installation.json'));
  if (!installed) return { status: 'unmanaged', codex_model_calls: 0 };
  const files = await versionFiles(directory, installed.version);
  if (
    sha256(await readFile(join(directory, 'config.json'))) !==
    sha256(files.config)
  )
    throw new Error('Active configuration changed');
  if (
    files.target &&
    resolve(directory, await readlink(join(directory, 'current'))) !==
      files.target
  )
    throw new Error('Active source version mismatch');
  const activation = await json(join(directory, 'activation.json'));
  return {
    ...installed,
    status:
      activation?.status === 'needs_action'
        ? 'needs_action'
        : installed.scheduler,
    codex_model_calls: 0,
  };
}

function argumentsFor(argv) {
  const [action, ...values] = argv;
  if (!['prepare', 'activate', 'rollback', 'status'].includes(action))
    throw new Error(
      'Use prepare --ref SHA, activate --version SHA, rollback, or status'
    );
  const names = {
    '--ref': 'ref',
    '--version': 'version',
    '--project': 'projectPath',
    '--directory': 'directory',
    '--config': 'configFile',
  };
  const options = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = names[values[index]];
    const value = values[index + 1];
    if (!key || !value || value.startsWith('--') || key in options)
      throw new Error('Unknown, duplicate, or missing installation option');
    options[key] = value;
  }
  return { action, options };
}

if (isMain(import.meta.url)) {
  try {
    if (process.platform !== 'darwin')
      throw new Error('The local scheduler installer requires macOS');
    const { action, options } = argumentsFor(process.argv.slice(2));
    const handlers = {
      prepare: prepareRelease,
      activate: activateRelease,
      rollback: rollbackRelease,
      status: value => installationStatus(value.directory),
    };
    console.log(JSON.stringify(await handlers[action](options), null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({ status: 'needs_action', message: error.message })
    );
    process.exitCode = 1;
  }
}
