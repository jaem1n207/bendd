import { NextRequest } from 'next/server';
import { describe, expect, test, vi } from 'vitest';
const capture = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
import { reportRouteError } from '@/lib/monitoring/route-error';

describe('OG 오류 로그', () => {
  test('error 레벨에 상태·요청 식별자·시간을 기록하고 쿼리를 제거한다', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('failed https://bendd.me/api/og?title=private');
    reportRouteError(
      error,
      new NextRequest('https://bendd.me/api/og?title=private', {
        headers: { 'x-vercel-id': 'request-1' },
      }),
      performance.now()
    );
    const entry = JSON.parse(log.mock.calls[0][0]);
    expect(entry).toMatchObject({
      event: 'route_error',
      route: '/api/og',
      status: 500,
      request_id: 'request-1',
      message: 'failed https://bendd.me/api/og',
    });
    expect(entry.time_to_response_ms).toBeGreaterThanOrEqual(0);
    expect(capture).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: expect.objectContaining({ route: '/api/og' }),
      })
    );
    log.mockRestore();
  });
});
