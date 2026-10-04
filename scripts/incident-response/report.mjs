import { isMain } from './paths.mjs';
import { readFile } from 'node:fs/promises';

const MINUTE_MS = 60 * 1000;

function time(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function minutes(start, end) {
  const left = time(start);
  const right = time(end);
  if (left === null || right === null || right < left) {
    return null;
  }
  return Math.round(((right - left) / MINUTE_MS) * 10) / 10;
}

export function durationMetrics(timeline) {
  const lower = minutes(timeline.first_failed, timeline.last_failed);
  const upper = minutes(timeline.last_healthy, timeline.recovered);
  const ordered =
    time(timeline.last_healthy) !== null &&
    time(timeline.first_failed) !== null &&
    time(timeline.last_failed) !== null &&
    time(timeline.recovered) !== null &&
    time(timeline.last_healthy) <= time(timeline.first_failed) &&
    time(timeline.first_failed) <= time(timeline.last_failed) &&
    time(timeline.last_failed) <= time(timeline.recovered);

  return {
    outage_bounds_minutes: ordered ? { lower, upper } : null,
    bounds_assumption: ordered
      ? 'Continuous outage between failed probes; intermittent recovery is not measured'
      : null,
    observed_failure_to_recovery_minutes: minutes(
      timeline.first_failed,
      timeline.recovered
    ),
    confirmation_to_recovery_minutes: minutes(
      timeline.confirmed,
      timeline.recovered
    ),
    response_to_recovery_minutes: minutes(
      timeline.response_started,
      timeline.recovered
    ),
    investigation_and_fix_minutes: minutes(
      timeline.response_started,
      timeline.patch_ready
    ),
    checks_and_merge_minutes: minutes(timeline.pr_created, timeline.merged),
    deployment_minutes: minutes(timeline.merged, timeline.deployment_ready),
  };
}

if (isMain(import.meta.url)) {
  const timeline = JSON.parse(await readFile(process.argv[2], 'utf8'));
  console.log(JSON.stringify(durationMetrics(timeline), null, 2));
}
