/* eslint-disable playwright/no-standalone-expect -- Vitest table tests share the project's .spec.ts glob. */
import { describe, expect, test } from 'vitest';

import {
  formatTimeDifference,
  timeDifferenceSentence,
} from '@/components/connection-globe/lib/time-difference';

describe('time difference copy', () => {
  test('keeps the approved same-time-zone sentence without a numeric counter', () => {
    expect(timeDifferenceSentence(0)).toBe('같은 시간대에 머물고 있어요.');
  });
  test.each([
    [960, '16시간'],
    [210, '3시간 30분'],
    [195, '3시간 15분'],
    [15, '15분'],
    [-120, '2시간'],
  ])('preserves the exact final difference %s', (minutes, expected) => {
    expect(formatTimeDifference(minutes)).toBe(expected);
  });
  test('counts whole-hour differences without displaying invented minute precision', () => {
    expect(formatTimeDifference(960, 0)).toBe('0시간');
    expect(formatTimeDifference(960, 0.5)).toBe('8시간');
  });
  test('describes Seoul behind the visitor', () => {
    expect(timeDifferenceSentence(-120)).toBe('서울은 2시간 느리네요.');
  });
});
