/* eslint-disable playwright/no-standalone-expect -- These are Vitest tests; the shared .spec.ts glob also enables Playwright's rule. */
import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/visitor-location/route';

describe('visitor location endpoint', () => {
  it('returns only validated IP geolocation, never the IP itself', async () => {
    const response = GET(
      new Request('https://bendd.me/api/visitor-location', {
        headers: {
          'x-vercel-ip-latitude': '37.5665',
          'x-vercel-ip-longitude': '126.978',
          'x-vercel-ip-city': '%EC%84%9C%EC%9A%B8',
          'x-vercel-ip-country': 'KR',
          'x-forwarded-for': '203.0.113.10',
        },
      })
    );
    expect(await response.json()).toEqual({
      location: {
        latitude: 37.5665,
        longitude: 126.978,
        city: '서울',
        country: 'KR',
      },
    });
    expect(response.headers.get('Cache-Control')).toContain(
      'private, no-store'
    );
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
  });

  it.each<Record<string, string>>([
    {},
    { 'x-vercel-ip-latitude': '', 'x-vercel-ip-longitude': '' },
    { 'x-vercel-ip-latitude': '91', 'x-vercel-ip-longitude': '0' },
    { 'x-vercel-ip-latitude': '0', 'x-vercel-ip-longitude': '-181' },
    { 'x-vercel-ip-latitude': 'NaN', 'x-vercel-ip-longitude': '0' },
    { 'x-vercel-ip-latitude': '0x10', 'x-vercel-ip-longitude': '0' },
  ])(
    'does not invent coordinates for missing or invalid headers %j',
    async headers => {
      const response = GET(
        new Request('https://bendd.me/api/visitor-location', { headers })
      );
      expect(await response.json()).toEqual({ location: null });
    }
  );

  it('accepts zero coordinates and tolerates a malformed optional city', async () => {
    const response = GET(
      new Request('https://bendd.me/api/visitor-location', {
        headers: {
          'x-vercel-ip-latitude': '0',
          'x-vercel-ip-longitude': '0',
          'x-vercel-ip-city': '%broken',
        },
      })
    );
    expect(await response.json()).toEqual({
      location: { latitude: 0, longitude: 0 },
    });
  });

  it('derives each response from that visitor rather than retaining a previous result', async () => {
    const first = GET(
      new Request('https://bendd.me/api/visitor-location', {
        headers: {
          'x-vercel-ip-latitude': '10',
          'x-vercel-ip-longitude': '20',
        },
      })
    );
    const second = GET(new Request('https://bendd.me/api/visitor-location'));
    expect(await first.json()).toEqual({
      location: { latitude: 10, longitude: 20 },
    });
    expect(await second.json()).toEqual({ location: null });
  });
});
