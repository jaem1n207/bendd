import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { runtimeDirectory } from './paths.mjs';
import { REPOSITORY } from './policy.mjs';

const exec = promisify(execFile);
const READ_ATTEMPTS = 3;
const BACKOFF_MS = 1000;
const TIMEOUT_MS = 30_000;
const LOG_BYTES = 1024 * 1024;
const API_VERSION = '2026-03-10';
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const CATEGORIES = [
  'access',
  'server',
  'rate_limit',
  'dns',
  'timeout',
  'connection',
  'tls',
  'runtime',
  'response',
  'not_found',
  'unknown',
];
const CODES = [
  'ENOENT',
  'EACCES',
  'EPERM',
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ENOBUFS',
];
const HTTP_ACCESS = [401, 403];
const HTTP_RATE_LIMIT = 429;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER = 500;

function exists(path) {
  try {
    return statSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export function safeEndpoint(path) {
  if (typeof path !== 'string' || path.length > 512) {
    return 'redacted-endpoint';
  }
  const endpoint = path.split('?')[0];
  return /^(?:actions\/(?:workflows(?:\/(?:\d+|availability\.yml)(?:\/(?:runs|dispatches))?)?|runs\/\d+(?:\/(?:artifacts|jobs))?)|issues(?:\/\d+(?:\/comments)?|\/comments\/\d+)?|pulls\/\d+(?:\/(?:files|merge))?|commits\/[a-f0-9]{40}\/(?:check-runs|statuses))$/.test(
    endpoint
  )
    ? endpoint
    : 'redacted-endpoint';
}

export function logDiagnostic(directory, fields) {
  // Only allowlisted metadata is serialized. Never stderr, bodies, headers, or env.
  const record = { at: new Date().toISOString() };
  if (/^(?:github|availability|monitor)\.[a-z_]+$/.test(fields.event ?? '')) {
    record.event = fields.event;
  }
  if (UUID.test(fields.request_id ?? '')) {
    record.request_id = fields.request_id;
  }
  if (['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(fields.method)) {
    record.method = fields.method;
  }
  if (fields.endpoint) {
    record.endpoint = safeEndpoint(fields.endpoint);
  }
  if (CATEGORIES.includes(fields.category)) {
    record.category = fields.category;
  }
  for (const name of [
    'attempt',
    'duration_ms',
    'http_status',
    'exit_code',
    'run_id',
    'workflow_id',
  ]) {
    if (Number.isSafeInteger(fields[name]) && fields[name] >= 0) {
      record[name] = fields[name];
    }
  }
  if (CODES.includes(fields.code)) {
    record.code = fields.code;
  }
  if (['SIGTERM', 'SIGKILL', 'SIGINT'].includes(fields.signal)) {
    record.signal = fields.signal;
  }
  for (const name of ['status', 'from_status']) {
    if (
      [
        'healthy',
        'waiting',
        'action',
        'needs_action',
        'requesting',
        'requested',
        'observed',
      ].includes(fields[name])
    ) {
      record[name] = fields[name];
    }
  }
  if (['run_receipt', 'later_monitor_run'].includes(fields.evidence)) {
    record.evidence = fields.evidence;
  }
  if (
    [
      'success',
      'failure',
      'timed_out',
      'cancelled',
      'skipped',
      'action_required',
      'neutral',
      'stale',
    ].includes(fields.conclusion)
  ) {
    record.conclusion = fields.conclusion;
  }
  const state = join(directory, 'state');
  const path = join(state, 'github-events.jsonl');
  try {
    mkdirSync(state, { recursive: true, mode: 0o700 });
    const line = JSON.stringify(record) + '\n';
    if ((exists(path)?.size ?? 0) + Buffer.byteLength(line) > LOG_BYTES) {
      if (exists(path + '.1')) {
        renameSync(path + '.1', path + '.2');
      }
      if (exists(path)) {
        renameSync(path, path + '.1');
      }
    }
    appendFileSync(path, line, { mode: 0o600 });
  } catch (error) {
    // A diagnostic failure must not discard a receipt for an accepted mutation.
    const code = ['EACCES', 'ENOSPC', 'EROFS', 'EISDIR', 'ENOENT'].includes(
      error.code
    )
      ? error.code
      : 'unknown';
    process.stderr.write(
      JSON.stringify({
        ...record,
        event: 'monitor.log_unavailable',
        failed_event: record.event,
        log_code: code,
      }) + '\n'
    );
  }
}

function classify(error) {
  const stderr = String(error.stderr ?? '').slice(0, 8192);
  const status = Number(stderr.match(/HTTP (\d{3})/)?.[1]) || null;
  let category = 'unknown';
  if (
    HTTP_ACCESS.includes(status) ||
    /please run:.*gh auth login|not logged into|authentication token/i.test(
      stderr
    )
  ) {
    category = 'access';
  } else if (status === HTTP_NOT_FOUND) {
    category = 'not_found';
  } else if (status === HTTP_RATE_LIMIT) {
    category = 'rate_limit';
  } else if (status >= HTTP_SERVER) {
    category = 'server';
  } else if (error instanceof SyntaxError) {
    category = 'response';
  } else if (['ENOENT', 'EACCES', 'EPERM', 'ENOBUFS'].includes(error.code)) {
    category = 'runtime';
  } else if (
    error.killed ||
    error.code === 'ETIMEDOUT' ||
    /deadline exceeded|i\/o timeout|request timed out/i.test(stderr)
  ) {
    category = 'timeout';
  } else if (
    /lookup .*no such host|temporary failure in name resolution|could not resolve host/i.test(
      stderr
    )
  ) {
    category = 'dns';
  } else if (
    ['ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(error.code) ||
    /connection (?:reset|refused)|unexpected EOF/i.test(stderr)
  ) {
    category = 'connection';
  } else if (/x509:|certificate|TLS handshake/i.test(stderr)) {
    category = 'tls';
  }
  return {
    category,
    http_status: status,
    code: CODES.includes(error.code) ? error.code : null,
    exit_code: Number.isSafeInteger(error.code) ? error.code : null,
    signal: ['SIGTERM', 'SIGKILL', 'SIGINT'].includes(error.signal)
      ? error.signal
      : null,
  };
}

export async function githubApi(path, method = 'GET', input, context = {}) {
  const directory = runtimeDirectory();
  const requestId = UUID.test(context.requestId ?? '')
    ? context.requestId
    : randomUUID();
  const endpoint = safeEndpoint(path);
  const attempts = method === 'GET' ? READ_ATTEMPTS : 1;
  const args = ['api', `repos/${REPOSITORY}/${path}`, '--method', method];
  if (method === 'POST' && /^actions\/workflows\/\d+\/dispatches$/.test(path)) {
    args.push('-H', `X-GitHub-Api-Version: ${API_VERSION}`);
  }
  if (input !== undefined) {
    args.push('--input', '-');
  }
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const metadata = { request_id: requestId, method, endpoint, attempt };
    logDiagnostic(directory, { ...metadata, event: 'github.start' });
    const started = performance.now();
    try {
      const pending = exec('gh', args, {
        timeout: TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
      });
      if (input !== undefined) {
        pending.child.stdin.end(JSON.stringify(input));
      }
      const { stdout } = await pending;
      const result = stdout.trim() ? JSON.parse(stdout) : null;
      logDiagnostic(directory, {
        ...metadata,
        event: 'github.success',
        duration_ms: Math.round(performance.now() - started),
      });
      return result;
    } catch (error) {
      const diagnostic = {
        ...metadata,
        ...classify(error),
        duration_ms: Math.round(performance.now() - started),
      };
      logDiagnostic(directory, { ...diagnostic, event: 'github.failure' });
      const transient = ['server', 'dns', 'timeout', 'connection'].includes(
        diagnostic.category
      );
      if (method === 'GET' && transient && attempt < attempts) {
        logDiagnostic(directory, {
          ...metadata,
          event: 'github.retry',
          category: diagnostic.category,
        });
        await delay(BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      const message =
        diagnostic.category === 'access'
          ? `GitHub ${diagnostic.http_status ? `HTTP ${diagnostic.http_status}` : 'authentication unavailable'}; stop and request access`
          : `GitHub request failed: ${diagnostic.category}${diagnostic.http_status ? ` (HTTP ${diagnostic.http_status})` : ''}`;
      throw Object.assign(new Error(message), { diagnostic });
    }
  }
}
