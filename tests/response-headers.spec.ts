import { expect, test } from '@playwright/test';

test('sets a security headers', async ({ request }) => {
  for (const pathname of ['/', '/article']) {
    const headers = (await request.get(pathname)).headers();
    expect(headers['content-security-policy']).toBe(
      "default-src 'self' vercel.live;    script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.vercel-insights.com vercel.live va.vercel-scripts.com;    style-src 'self' 'unsafe-inline';    img-src * blob: data:;    media-src 'self';    connect-src *;    font-src 'self' data:;    frame-src 'self' *.codesandbox.io vercel.live;"
    );
    expect(headers['referrer-policy']).toBe('origin-when-cross-origin');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-dns-prefetch-control']).toBe('on');
    expect(headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
    expect(headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=()'
    );
  }
});
