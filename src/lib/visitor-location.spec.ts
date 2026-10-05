/* eslint-disable playwright/no-standalone-expect -- Vitest table tests share the project's .spec.ts glob. */
import { describe, expect, test } from 'vitest';

import { visitorLocationFromHeaders } from '@/lib/visitor-location';

const headers = (timeZone?: string) =>
  new Headers({
    'x-vercel-ip-latitude': '37.7749',
    'x-vercel-ip-longitude': '-122.4194',
    ...(timeZone ? { 'x-vercel-ip-timezone': timeZone } : {}),
    'x-forwarded-for': '192.0.2.1',
  });

describe('visitor location time zone', () => {
  test('uses the same platform location as the globe without exposing IP addresses', () => {
    expect(visitorLocationFromHeaders(headers('America/Los_Angeles'))).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      timeZone: 'America/Los_Angeles',
    });
  });

  test.each([undefined, 'Invalid/Zone', '   '])(
    'keeps valid coordinates when time zone is %s',
    timeZone => {
      const location = visitorLocationFromHeaders(headers(timeZone));
      expect(location?.latitude).toBe(37.7749);
      expect(location?.timeZone).toBeUndefined();
    }
  );

  test('does not substitute a time zone for missing coordinates', () => {
    expect(
      visitorLocationFromHeaders(
        new Headers({ 'x-vercel-ip-timezone': 'Asia/Seoul' })
      )
    ).toBeNull();
  });
});
