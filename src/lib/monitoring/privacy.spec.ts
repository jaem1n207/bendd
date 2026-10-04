import { describe, expect, it } from 'vitest';
import { redactErrorText, stripUrlDetails } from '@/lib/monitoring/privacy';
import { scrubErrorEvent } from '@/lib/monitoring/sentry-options';

describe('오류 정보 최소화', () => {
  test('URL 쿼리와 fragment를 제거한다', () => {
    expect(
      stripUrlDetails('https://bendd.me/article/a?token=secret#form')
    ).toBe('https://bendd.me/article/a');
    expect(stripUrlDetails('/article/a?token=secret')).toBe('/article/a');
  });
  test('오류 메시지에서 URL 쿼리, 이메일, 인증 값을 제거한다', () => {
    expect(
      redactErrorText(
        'failed https://bendd.me/a?token=secret user@example.com Bearer abc password=secret'
      )
    ).toBe(
      'failed https://bendd.me/a [email] Bearer [redacted] password=[redacted]'
    );
  });
  test('본문·쿠키·사용자·추가 정보·breadcrumb를 전송하지 않는다', () => {
    const event = scrubErrorEvent({
      type: undefined,
      user: { email: 'user@example.com', id: '123' },
      extra: { input: 'private' },
      breadcrumbs: [{ message: 'private' }],
      request: {
        url: 'https://bendd.me/a?token=private',
        method: 'GET',
        headers: { Cookie: 'private' },
        data: 'private',
      },
      exception: {
        values: [
          {
            value: 'private@example.com',
            stacktrace: {
              frames: [
                {
                  filename: 'https://bendd.me/a.js?key=private',
                  vars: { input: 'private' },
                },
              ],
            },
          },
        ],
      },
    });
    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.request).toEqual({ method: 'GET', url: 'https://bendd.me/a' });
    expect(event.exception?.values?.[0].value).toBe('[email]');
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({
      filename: 'https://bendd.me/a.js',
    });
  });
});
