import { beforeEach, describe, expect, it, vi } from 'vitest';

// 모듈 스코프 Set이 테스트 간에 공유되지 않도록 매번 새로 로드한다
async function loadFreshModule() {
  vi.resetModules();
  return import('../lib/entrance-animation');
}

describe('entrance-animation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('처음 방문한 경로는 애니메이션을 재생한다', async () => {
    const { shouldPlayEntranceAnimation } = await loadFreshModule();

    expect(shouldPlayEntranceAnimation('/article')).toBe(true);
  });

  it('재생 기록이 있는 경로는 애니메이션을 생략한다', async () => {
    const { shouldPlayEntranceAnimation, markEntranceAnimationPlayed } =
      await loadFreshModule();

    markEntranceAnimationPlayed('/article');

    expect(shouldPlayEntranceAnimation('/article')).toBe(false);
  });

  it('경로별로 독립적으로 기록한다', async () => {
    const { shouldPlayEntranceAnimation, markEntranceAnimationPlayed } =
      await loadFreshModule();

    markEntranceAnimationPlayed('/article');

    expect(shouldPlayEntranceAnimation('/craft')).toBe(true);
  });

  it('같은 경로를 여러 번 기록해도 생략 판정이 유지된다', async () => {
    const { shouldPlayEntranceAnimation, markEntranceAnimationPlayed } =
      await loadFreshModule();

    markEntranceAnimationPlayed('/craft');
    markEntranceAnimationPlayed('/craft');

    expect(shouldPlayEntranceAnimation('/craft')).toBe(false);
  });
});
