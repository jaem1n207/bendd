import { afterEach, describe, expect, test, vi } from 'vitest';

import { getSentryOptions } from '@/lib/monitoring/sentry-options';

const BUILD_RELEASE = 'build-git-revision';

afterEach(() => vi.unstubAllEnvs());

describe('Sentry 릴리스 설정', () => {
  test('공개 커밋 변수가 없으면 SDK의 빌드 릴리스 기본값을 보존한다', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', undefined);
    const options = { release: BUILD_RELEASE, ...getSentryOptions() };
    expect(options.release).toBe(BUILD_RELEASE);
  });

  test('이전 공개 커밋 값이 있어도 SDK의 빌드 릴리스를 덮어쓰지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'stale-commit');
    const options = { release: BUILD_RELEASE, ...getSentryOptions() };
    expect(options.release).toBe(BUILD_RELEASE);
  });
});
