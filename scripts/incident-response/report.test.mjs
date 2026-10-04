import assert from 'node:assert/strict';
import test from 'node:test';
import { durationMetrics } from './report.mjs';

const timeline = {
  last_healthy: '2026-10-05T00:00:00Z',
  first_failed: '2026-10-05T00:30:00Z',
  confirmed: '2026-10-05T01:00:00Z',
  response_started: '2026-10-05T01:05:00Z',
  last_failed: '2026-10-05T01:10:00Z',
  patch_ready: '2026-10-05T01:12:00Z',
  pr_created: '2026-10-05T01:13:00Z',
  merged: '2026-10-05T01:15:00Z',
  deployment_ready: '2026-10-05T01:18:00Z',
  recovered: '2026-10-05T01:20:00Z',
};

test('reports an outage interval rather than inventing the onset time', () => {
  const result = durationMetrics(timeline);
  assert.deepEqual(result.outage_bounds_minutes, { lower: 40, upper: 80 });
  assert.equal(result.observed_failure_to_recovery_minutes, 50);
  assert.equal(result.confirmation_to_recovery_minutes, 20);
  assert.equal(result.response_to_recovery_minutes, 15);
  assert.equal(result.investigation_and_fix_minutes, 7);
  assert.equal(result.checks_and_merge_minutes, 2);
  assert.equal(result.deployment_minutes, 3);
});

test('missing samples remain unknown', () => {
  const result = durationMetrics({ ...timeline, last_healthy: null });
  assert.equal(result.outage_bounds_minutes, null);
  assert.equal(result.response_to_recovery_minutes, 15);
});

test('invalid or reversed timestamps are never reported as durations', () => {
  const result = durationMetrics({
    ...timeline,
    recovered: 'bad',
    patch_ready: timeline.last_healthy,
  });
  assert.equal(result.outage_bounds_minutes, null);
  assert.equal(result.response_to_recovery_minutes, null);
  assert.equal(result.investigation_and_fix_minutes, null);
});

test('natural recovery has no invented patch or deployment duration', () => {
  const result = durationMetrics({
    last_healthy: timeline.last_healthy,
    first_failed: timeline.first_failed,
    last_failed: timeline.last_failed,
    recovered: timeline.recovered,
  });
  assert.equal(result.investigation_and_fix_minutes, null);
  assert.equal(result.deployment_minutes, null);
});
