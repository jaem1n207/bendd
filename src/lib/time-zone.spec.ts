/* eslint-disable playwright/no-standalone-expect -- Vitest table tests share the project's .spec.ts glob. */
import { describe, expect, test } from 'vitest';

import { seoulTimeDifference } from '@/lib/time-zone';

describe('Seoul minus visitor UTC offset in minutes', () => {
  test.each([
    ['Asia/Seoul', '2026-07-01', 0],
    ['Asia/Tokyo', '2026-07-01', 0],
    ['America/Los_Angeles', '2026-07-01', 960],
    ['America/Los_Angeles', '2026-01-01', 1020],
    ['Asia/Kolkata', '2026-07-01', 210],
    ['Asia/Kathmandu', '2026-07-01', 195],
    ['Australia/Eucla', '2026-07-01', 15],
    ['Australia/Sydney', '2026-01-01', -120],
    ['Australia/Sydney', '2026-07-01', -60],
    ['Pacific/Pago_Pago', '2026-07-01', 1200],
    ['UTC', '2026-07-01', 540],
    ['America/Los_Angeles', '2026-03-08T09:59:59Z', 1020],
    ['America/Los_Angeles', '2026-03-08T10:00:00Z', 960],
  ])(
    'calculates %s at %s without a device-time-zone fallback',
    (zone, instant, expected) => {
      expect(seoulTimeDifference(zone, new Date(instant))).toBe(expected);
    }
  );

  test.each([undefined, null, '', 'Invalid/Zone', 123])(
    'omits unknown zone %s',
    zone => {
      expect(seoulTimeDifference(zone)).toBeNull();
    }
  );

  test('omits an invalid instant', () => {
    expect(seoulTimeDifference('Asia/Seoul', new Date('invalid'))).toBeNull();
  });
});
