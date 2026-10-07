export const REPOSITORY = 'jaem1n207/bendd';
export const OWNER = 'jaem1n207';
export const INCIDENT_MARKER = '<!-- bendd-availability-incident:v1 -->';
export const RESPONSE_MARKER = '<!-- bendd-codex-response:v1';
export const WORKFLOW_PATH = '.github/workflows/availability.yml';
export const MONITOR_INTERVAL_MINUTES = 60;
// Five-minute margin keeps hourly ticks eligible despite job completion jitter.
export const MONITOR_REFRESH_AFTER_MS =
  (MONITOR_INTERVAL_MINUTES - 5) * 60 * 1000;
export const MAX_MONITOR_GAP_MS = 3 * MONITOR_INTERVAL_MINUTES * 60 * 1000;
export const MAX_RESPONSE_AGE_MS = 24 * 60 * 60 * 1000;
export const REQUIRED_CHECKS = [
  'Verify',
  'Analyze (actions)',
  'Analyze (javascript-typescript)',
];
export const TERMINAL_PHASES = ['completed', 'needs_action'];
export const PHASES = [
  'investigating',
  'awaiting_checks',
  'awaiting_deploy',
  ...TERMINAL_PHASES,
];
const APP_PATHS = [
  /^src\/app\/(?:page\.tsx|article\/|craft\/|api\/(?:feed|og)\/)/,
  /^src\/components\/(?:article|comments|navigation|sound|theme|ui)\//,
  /^src\/hooks\//,
  /^src\/mdx\/(?:components|common)\//,
  /^tests\/[^/]+\.spec\.ts$/,
];
const SENSITIVE_PATH =
  /(?:auth|consent|privacy|analytics|observability|sentry|security|middleware|instrumentation|with-sound)/i;
const UNSAFE_LINE =
  /@ts-ignore|@ts-expect-error|eslint-disable|blockDangerousJS|blockJS|dangerouslySetInnerHTML|process\.env|(?:\b(?:it|test|describe)\.(?:skip|only|todo)\s*\()/;
const FULL_SHA = /^[a-f0-9]{40}$/;

export function validNumber(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isIncident(issue) {
  return (
    validNumber(issue?.number) &&
    !issue.pull_request &&
    issue.user?.login === 'github-actions[bot]' &&
    ['open', 'closed'].includes(issue.state) &&
    issue.body?.startsWith(INCIDENT_MARKER) &&
    issue.assignees?.some(assignee => assignee.login === OWNER) &&
    Number.isFinite(Date.parse(issue.created_at))
  );
}

export function incidentRunId(issue) {
  if (!isIncident(issue)) {
    throw new Error('Untrusted incident');
  }
  const match = issue.body.match(
    /https:\/\/github\.com\/jaem1n207\/bendd\/actions\/runs\/(\d+)/
  );
  if (!match) {
    throw new Error('Incident has no monitoring run');
  }
  return match[1];
}

export function isMonitorRun(run) {
  return (
    run?.path === WORKFLOW_PATH &&
    run.head_branch === 'main' &&
    run.repository?.full_name === REPOSITORY &&
    ['schedule', 'workflow_dispatch'].includes(run.event) &&
    FULL_SHA.test(run.head_sha ?? '')
  );
}

export function validateState(value) {
  if (
    value?.version !== 1 ||
    !validNumber(value.issue) ||
    !PHASES.includes(value.phase) ||
    !Number.isFinite(Date.parse(value.started_at)) ||
    !Number.isFinite(Date.parse(value.updated_at)) ||
    value.attempt !== 1 ||
    (value.pr !== null && !validNumber(value.pr)) ||
    (value.head_sha !== null && !FULL_SHA.test(value.head_sha ?? ''))
  ) {
    throw new Error('Invalid response state');
  }
  if (
    ['awaiting_checks', 'awaiting_deploy'].includes(value.phase) &&
    (!validNumber(value.pr) || !FULL_SHA.test(value.head_sha ?? ''))
  ) {
    throw new Error('Missing response PR');
  }
  return value;
}

export function assertFileScope(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Empty response diff');
  }
  for (const file of files) {
    if (
      typeof file.filename !== 'string' ||
      !APP_PATHS.some(pattern => pattern.test(file.filename)) ||
      SENSITIVE_PATH.test(file.filename) ||
      !['added', 'modified'].includes(file.status) ||
      typeof file.patch !== 'string'
    ) {
      throw new Error(
        `File needs manual review: ${file.filename ?? 'unknown'}`
      );
    }
    const changed = file.patch
      .split('\n')
      .filter(line => /^[+-]/.test(line) && !/^(?:\+\+\+|---)/.test(line));
    if (changed.some(line => UNSAFE_LINE.test(line))) {
      throw new Error(`Sensitive diff: ${file.filename}`);
    }
    if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file.filename)) {
      if (changed.some(line => line.startsWith('-'))) {
        throw new Error(`Existing test changed: ${file.filename}`);
      }
    }
  }
}

export function assertMerge({ pr, files, checks, statuses, state, sha }) {
  validateState(state);
  if (
    state.phase !== 'awaiting_checks' ||
    state.pr !== pr?.number ||
    state.head_sha !== sha ||
    !FULL_SHA.test(sha ?? '') ||
    pr.head?.sha !== sha ||
    pr.head?.ref !== `fix/incident-${state.issue}` ||
    pr.head?.repo?.full_name !== REPOSITORY ||
    pr.base?.ref !== 'main' ||
    pr.base?.repo?.full_name !== REPOSITORY ||
    pr.user?.login !== OWNER ||
    pr.draft !== false ||
    pr.state !== 'open' ||
    pr.mergeable !== true ||
    pr.mergeable_state !== 'clean' ||
    !pr.body?.includes(`<!-- bendd-codex-fix:v1 issue=${state.issue} -->`)
  ) {
    throw new Error('PR identity or merge state mismatch');
  }
  assertFileScope(files);
  for (const name of REQUIRED_CHECKS) {
    const matches = checks.filter(check => check.name === name);
    if (
      matches.length === 0 ||
      matches.some(
        check =>
          check.head_sha !== sha ||
          check.status !== 'completed' ||
          check.conclusion !== 'success'
      )
    ) {
      throw new Error(`Required check not successful: ${name}`);
    }
  }
  if (
    checks.some(
      check =>
        check.status !== 'completed' ||
        !['success', 'neutral', 'skipped'].includes(check.conclusion)
    )
  ) {
    throw new Error('A PR check has not succeeded');
  }
  const contexts = new Map();
  for (const status of statuses) {
    if (!contexts.has(status.context)) {
      contexts.set(status.context, status);
    }
  }
  const preview = contexts.get('Vercel');
  if (
    preview?.state !== 'success' ||
    !/^https:\/\/vercel\.com\/jaemins-crafts\/bendd\//.test(
      preview.target_url ?? ''
    ) ||
    [...contexts.values()].some(status => status.state !== 'success')
  ) {
    throw new Error('Preview or commit status not successful');
  }
  return {
    issue: state.issue,
    pr: pr.number,
    sha,
    preview: preview.target_url,
  };
}
