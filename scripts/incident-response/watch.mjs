import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isMain, runtimeDirectory } from './paths.mjs';
import { verifyInstallation } from './integrity.mjs';
import { promisify } from 'node:util';
import { checkAvailability } from '../check-availability.mjs';
import { createControl, githubApi } from './control.mjs';
import { prepareWorktree, requireSubscription, runCodex } from './dispatch.mjs';
import {
  REQUIRED_CHECKS,
  REPOSITORY,
  isIncident,
  validNumber,
} from './policy.mjs';
import { createVercelReader } from './vercel-read.mjs';

const ROOT = runtimeDirectory();
const execAsync = promisify(execFile);

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw new Error('Unreadable watcher state; do not reset');
  }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600,
  });
  await rename(temporary, path);
}

export const verifyManifest = verifyInstallation;

export function checksReadiness(checks, statuses, sha) {
  if (!Array.isArray(checks) || !Array.isArray(statuses))
    throw new Error('Invalid PR checks');
  if (checks.some(check => check.head_sha !== sha))
    throw new Error('PR check SHA mismatch');
  const latest = new Map();
  for (const status of statuses)
    if (!latest.has(status.context)) latest.set(status.context, status);
  if (
    checks.some(
      check =>
        check.status === 'completed' &&
        !['success', 'neutral', 'skipped'].includes(check.conclusion)
    ) ||
    [...latest.values()].some(status =>
      ['failure', 'error'].includes(status.state)
    )
  )
    return 'failed';
  for (const name of REQUIRED_CHECKS) {
    const matches = checks.filter(check => check.name === name);
    if (
      matches.some(
        check => check.status === 'completed' && check.conclusion !== 'success'
      )
    )
      return 'failed';
    if (!matches.length || matches.some(check => check.status !== 'completed'))
      return 'waiting';
  }
  if (
    checks.some(check => check.status !== 'completed') ||
    latest.get('Vercel')?.state !== 'success' ||
    [...latest.values()].some(status => status.state !== 'success')
  )
    return 'waiting';
  return 'ready';
}

function validateProbe(probe) {
  if (
    !Array.isArray(probe?.results) ||
    probe.results.length !== 4 ||
    probe.results.some(result => typeof result.ok !== 'boolean')
  )
    throw new Error('Invalid production probe');
  if (probe.results.some(result => [401, 403].includes(result.status))) {
    throw new Error('Production HTTP 401/403; stop and request access');
  }
  return probe.results.every(result => result.ok);
}

async function notify() {
  try {
    await execAsync(
      '/usr/bin/osascript',
      [
        '-e',
        'display notification "GitHub 장애 이슈 또는 로컬 대응 기록을 확인해 주세요." with title "Bendd 장애 대응"',
      ],
      { timeout: 10_000, maxBuffer: 16 * 1024 }
    );
  } catch {
    /* GitHub remains the primary incident notification channel. */
  }
}

export function createWatcher({
  directory = ROOT,
  api = githubApi,
  control = createControl({ directory, api }),
  probe = checkAvailability,
  deployment = createVercelReader().readiness,
  authenticate = requireSubscription,
  prepare = prepareWorktree,
  runner = runCodex,
  integrity = verifyManifest,
  alert = notify,
  now = () => new Date(),
} = {}) {
  const watcherPath = join(directory, 'state', 'watcher.json');
  const lockPath = join(directory, 'state', 'watcher.lock');

  async function lock() {
    await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });
    try {
      await writeFile(lockPath, JSON.stringify({ pid: process.pid }), {
        flag: 'wx',
        mode: 0o600,
      });
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readJson(lockPath);
      if (!Number.isSafeInteger(existing?.pid) || existing.pid <= 0)
        throw new Error('Invalid watcher lock; manual review required');
      try {
        process.kill(existing.pid, 0);
        return false;
      } catch (failure) {
        if (failure.code !== 'ESRCH') return false;
        // A stale lock can hide an interrupted Codex child. Never auto-reclaim it.
        throw new Error(
          'Interrupted watcher; inspect its Codex process before unlocking'
        );
      }
    }
  }

  async function pages(path, field) {
    const entries = [];
    for (let page = 1; page <= 20; page += 1) {
      const result = await api(
        `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`
      );
      const batch = field ? result[field] : result;
      if (!Array.isArray(batch))
        throw new Error('Invalid GitHub readiness list');
      entries.push(...batch);
      if (batch.length < 100) return entries;
    }
    throw new Error('Readiness pagination limit; manual review required');
  }

  async function readiness(action) {
    const issue = await api(`issues/${action.issue}`);
    if (!isIncident(issue) || issue.number !== action.issue)
      throw new Error('Incident identity changed');
    if (action.phase === 'new') {
      if (issue.state !== 'open')
        return { status: 'skip', reason: 'closed_without_response' };
      const result = await probe();
      if (validateProbe(result))
        return {
          status: 'skip',
          reason: 'recovered_before_response',
          probe: result,
        };
      return { status: 'ready', reason: 'active_outage', probe: result };
    }
    if (action.phase === 'awaiting_checks') {
      const pr = await api(`pulls/${action.state.pr}`);
      if (pr.head?.sha !== action.state.head_sha || pr.state !== 'open')
        throw new Error('Response PR changed outside the guarded process');
      if (issue.state === 'closed')
        return { status: 'ready', reason: 'natural_recovery' };
      const checks = await pages(
        `commits/${action.state.head_sha}/check-runs`,
        'check_runs'
      );
      const statuses = await pages(`commits/${action.state.head_sha}/statuses`);
      const status = checksReadiness(checks, statuses, action.state.head_sha);
      if (status === 'failed')
        return { status: 'ready', reason: 'checks_failed' };
      if (status !== 'ready')
        return { status: 'waiting', reason: 'checks_pending' };
      await control.mergeGate(action.issue, action.state.head_sha);
      return { status: 'ready', reason: 'checks_ready' };
    }
    if (action.phase === 'awaiting_deploy') {
      const result = await deployment(action.state.merge_sha);
      if (result.status === 'waiting')
        return { status: 'waiting', reason: 'deployment_pending' };
      if (!['ready', 'failed'].includes(result.status))
        throw new Error('Invalid production readiness');
      return {
        status: 'ready',
        reason:
          result.status === 'ready' ? 'deployment_ready' : 'deployment_failed',
      };
    }
    throw new Error('Unsupported response phase; do not dispatch');
  }

  async function run({ dispatch = true } = {}) {
    let ownsLock = false;
    let canSaveWatcher = false;
    let watcher = {
      version: 1,
      dispatches: {},
      codex_invocations: 0,
      blocked: false,
    };
    let calls = 0;
    const decisions = [];
    async function finish(status, message, blocked = false) {
      const fingerprint = `${status}:${message}`;
      const priorAlert = canSaveWatcher
        ? watcher
        : await readJson(join(directory, 'state', 'watcher-alert.json'));
      const shouldNotify =
        status === 'needs_action' && priorAlert?.fingerprint !== fingerprint;
      if (canSaveWatcher) {
        watcher = {
          ...watcher,
          status,
          message,
          blocked,
          fingerprint,
          checked_at: now().toISOString(),
          decisions,
        };
        await saveJson(watcherPath, watcher);
      } else {
        // Preserve malformed operational state and stale locks for manual inspection.
        await saveJson(join(directory, 'state', 'watcher-alert.json'), {
          status,
          message,
          fingerprint,
        });
      }
      if (shouldNotify) await alert();
      return {
        status,
        message,
        decisions,
        codex_invocations_this_run: calls,
        codex_invocations_total: watcher?.codex_invocations ?? 0,
        notify: shouldNotify,
      };
    }
    try {
      ownsLock = await lock();
      if (!ownsLock) return { status: 'busy', codex_invocations_this_run: 0 };
      watcher = await readJson(watcherPath, watcher);
      if (
        watcher?.version !== 1 ||
        !watcher.dispatches ||
        typeof watcher.dispatches !== 'object' ||
        Array.isArray(watcher.dispatches) ||
        !Number.isSafeInteger(watcher.codex_invocations) ||
        watcher.codex_invocations < 0 ||
        Object.values(watcher.dispatches).some(
          entry =>
            !validNumber(entry.issue) ||
            !['running', 'finished'].includes(entry.status)
        )
      ) {
        throw new Error('Invalid watcher state');
      }
      canSaveWatcher = true;
      if (watcher.blocked) return finish('needs_action', watcher.message, true);
      await integrity(directory);
      const config = await readJson(join(directory, 'config.json'));
      if (
        config?.repository !== REPOSITORY ||
        config.dispatch_mode !== 'incident-only' ||
        config.authentication !== 'ChatGPT subscription' ||
        config.api_billing !== false ||
        !config.runtime?.codex ||
        config.response_model !== 'gpt-6.1-sol' ||
        config.reasoning_effort !== 'high' ||
        config.session_mode !== 'new-project-thread' ||
        !config.project_id
      )
        throw new Error('Invalid incident-only subscription configuration');
      const poll = await control.poll();
      if (['healthy', 'waiting'].includes(poll.status))
        return finish(poll.status, poll.message);
      if (poll.status === 'needs_action')
        return finish('needs_action', poll.message, poll.blocked === true);
      if (poll.status !== 'action' || !Array.isArray(poll.actions))
        throw new Error('Invalid monitor decision');
      for (const action of poll.actions) {
        const ready = await readiness(action);
        decisions.push({ issue: action.issue, phase: action.phase, ...ready });
        if (ready.status !== 'ready' || !dispatch) continue;
        const key = `${action.issue}:${action.phase}:${action.state?.head_sha ?? 'initial'}`;
        if (watcher.dispatches[key])
          throw new Error(
            'Response stage already dispatched; no automatic repeat'
          );
        if (
          Object.values(watcher.dispatches).filter(
            entry => entry.issue === action.issue
          ).length >= 3
        )
          throw new Error('Incident dispatch limit reached');
        await authenticate(config);
        let state = action.state;
        if (action.phase === 'new') state = await control.claim(action.issue);
        const prior = Object.values(watcher.dispatches).find(
          entry => entry.issue === action.issue
        );
        const worktree = await prepare(
          config,
          directory,
          action.issue,
          prior?.worktree
        );
        if (action.phase === 'new') {
          const latest = await api(`issues/${action.issue}`);
          const fresh = await probe();
          if (!isIncident(latest) || latest.number !== action.issue)
            throw new Error('Incident identity changed before dispatch');
          if (latest.state === 'closed' || validateProbe(fresh)) {
            await control.checkpoint(action.issue, {
              phase: 'completed',
              reason: 'Recovered before Codex dispatch; no model invoked',
            });
            decisions.push({
              issue: action.issue,
              status: 'skip',
              reason: 'recovered_before_dispatch',
            });
            continue;
          }
        }
        const started = now().toISOString();
        const output = join(
          directory,
          'results',
          `incident-${action.issue}-${action.phase}.md`
        );
        watcher.dispatches[key] = {
          issue: action.issue,
          phase: action.phase,
          reason: ready.reason,
          worktree,
          output,
          started_at: started,
          status: 'running',
        };
        await saveJson(watcherPath, watcher); // Persist the exclusive dispatch before creating a session.
        let modelStarted = false;
        const result = await runner({
          config,
          directory,
          worktree,
          action: { ...action, state },
          reason: ready.reason,
          output,
          forbiddenIds: [
            ...(config.excluded_session_ids ?? []),
            ...Object.values(watcher.dispatches)
              .flatMap(entry => [entry.thread_id, entry.session_id])
              .filter(Boolean),
          ],
          onSession: async session => {
            watcher.dispatches[key] = {
              ...watcher.dispatches[key],
              ...session,
            };
            await saveJson(watcherPath, watcher);
          },
          onModelStart: async () => {
            if (modelStarted)
              throw new Error(
                'Codex model start already counted; do not repeat'
              );
            modelStarted = true;
            watcher.codex_invocations += 1;
            calls += 1;
            watcher.dispatches[key].model_started_at = now().toISOString();
            await saveJson(watcherPath, watcher);
          },
        });
        watcher.dispatches[key] = {
          ...watcher.dispatches[key],
          ...result,
          finished_at: now().toISOString(),
          status: 'finished',
        };
        await saveJson(watcherPath, watcher);
        if (result.exit_code !== 0 || result.failed || result.timed_out)
          throw new Error(
            'Codex response failed or needs approval; inspect the local result, no automatic retry'
          );
        const next = await control.readState(action.issue);
        if (
          !next ||
          next.phase === 'investigating' ||
          next.phase === action.phase
        )
          throw new Error(
            'Codex did not save an advancing checkpoint; no automatic repeat'
          );
        if (next.phase === 'needs_action')
          return finish(
            'needs_action',
            `Incident ${action.issue} requires user action; see GitHub and the local response`
          );
        await alert(); // Once for an actual incident stage, never for healthy checks.
      }
      return finish(
        calls ? 'responded' : 'idle',
        calls
          ? 'Verified incident response executed'
          : 'No actionable outage response; Codex not invoked'
      );
    } catch (error) {
      return finish(
        'needs_action',
        error.message,
        /HTTP (?:401|403)|already dispatched|dispatch limit|Codex|checkpoint|worktree|login|source changed|configuration|manifest/i.test(
          error.message
        )
      );
    } finally {
      if (ownsLock) await rm(lockPath);
    }
  }

  async function unblock() {
    // Only run after the user explicitly changes access and authorizes a recheck.
    const state = await readJson(watcherPath);
    if (state)
      await saveJson(watcherPath, {
        ...state,
        blocked: false,
        fingerprint: null,
      });
    return control.unblock();
  }
  return { run, unblock };
}

if (isMain(import.meta.url)) {
  const watcher = createWatcher();
  const result =
    process.argv[2] === 'unblock'
      ? await watcher.unblock()
      : await watcher.run({ dispatch: process.argv[2] !== '--check' });
  console.log(JSON.stringify(result));
  if (result.status === 'needs_action') process.exitCode = 1;
}
