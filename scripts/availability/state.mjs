import { CHECKS } from '../check-availability.mjs';

export const FAILURE_THRESHOLD = 2;
// Three hourly intervals preserve one delayed check without trusting stale history.
export const MAX_GAP_MS = 3 * 60 * 60 * 1000;
export const STATE_VERSION = 1;
const PATHS = CHECKS.map(check => check.path.split('?')[0]);

export function parseState(value) {
  if (
    value?.version !== STATE_VERSION ||
    !Number.isFinite(Date.parse(value.checked_at))
  ) {
    throw new Error('Invalid availability state');
  }

  for (const path of PATHS) {
    const count = value.failures?.[path];
    if (!Number.isInteger(count) || count < 0 || count > FAILURE_THRESHOLD) {
      throw new Error('Invalid availability failure count');
    }
  }

  return value;
}

export function advanceState(previous, report) {
  const checkedAt = Date.parse(report.checked_at);
  const gap = previous ? checkedAt - Date.parse(previous.checked_at) : Infinity;
  const continuous = gap >= 0 && gap <= MAX_GAP_MS;
  const failures = {};

  if (!Number.isFinite(checkedAt) || report.results.length !== PATHS.length) {
    throw new Error('Invalid availability report');
  }

  for (const path of PATHS) {
    const result = report.results.find(item => item.path === path);
    if (!result || typeof result.ok !== 'boolean') {
      throw new Error('Missing availability result');
    }
    const count = continuous ? previous.failures[path] : 0;
    failures[path] = result.ok ? 0 : Math.min(count + 1, FAILURE_THRESHOLD);
  }

  return { version: STATE_VERSION, checked_at: report.checked_at, failures };
}

export function getTransition(state, report, incident) {
  if (report.results.every(result => result.ok)) {
    return incident ? 'recovered' : 'healthy';
  }
  if (incident) {
    return 'ongoing';
  }
  return Object.values(state.failures).some(count => count >= FAILURE_THRESHOLD)
    ? 'outage'
    : 'suspected';
}
