import { beforeEach, describe, expect, it, vi } from 'vitest';

// 모듈 스코프 상태가 테스트 간에 공유되지 않도록 매번 새로 로드한다
async function loadFreshModule() {
  vi.resetModules();
  return import('../model/pathname-history');
}

describe('pathname-history', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('기록이 없으면 null을 반환한다', async () => {
    const { getPreviousPathname } = await loadFreshModule();

    expect(getPreviousPathname('/article')).toBe(null);
  });

  it('아직 기록되지 않은 현재 경로 기준으로 마지막 기록을 반환한다', async () => {
    const { getPreviousPathname, recordPathname } = await loadFreshModule();

    recordPathname('/article/some-post');

    expect(getPreviousPathname('/article')).toBe('/article/some-post');
  });

  it('현재 경로가 이미 기록됐으면 그 이전 경로를 반환한다', async () => {
    const { getPreviousPathname, recordPathname } = await loadFreshModule();

    recordPathname('/article/some-post');
    recordPathname('/article');

    expect(getPreviousPathname('/article')).toBe('/article/some-post');
  });

  it('같은 경로가 중복 기록돼도 직전 경로를 유지한다', async () => {
    const { getPreviousPathname, recordPathname } = await loadFreshModule();

    recordPathname('/article/some-post');
    recordPathname('/article');
    recordPathname('/article');

    expect(getPreviousPathname('/article')).toBe('/article/some-post');
  });

  it('경로 이동을 따라 직전 경로가 갱신된다', async () => {
    const { getPreviousPathname, recordPathname } = await loadFreshModule();

    recordPathname('/article');
    recordPathname('/craft');
    recordPathname('/article');

    expect(getPreviousPathname('/article')).toBe('/craft');
  });
});
