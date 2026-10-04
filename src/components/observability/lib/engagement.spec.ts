import { describe, expect, it } from 'vitest';
import {
  contentProgress,
  isEngagedRead,
  relatedPath,
} from '@/components/observability/lib/engagement';

describe('참여 지표 조건', () => {
  test('30초와 본문 75%를 모두 충족해야 한다', () => {
    expect(isEngagedRead(29_999, 1)).toBe(false);
    expect(isEngagedRead(30_000, 0.74)).toBe(false);
    expect(isEngagedRead(30_000, 0.75)).toBe(true);
  });
  test('페이지 footer 대신 본문 길이로 진도를 계산한다', () => {
    expect(contentProgress(new DOMRect(0, -500, 700, 2000), 1000)).toBe(0.75);
    expect(contentProgress(new DOMRect(0, 1200, 700, 2000), 1000)).toBe(0);
  });
  test('같은 글, 외부 링크, 목록 링크는 제외하고 쿼리는 제거한다', () => {
    expect(relatedPath('/article/b?token=private#summary', '/article/a')).toBe(
      '/article/b'
    );
    expect(relatedPath('/article/a#summary', '/article/a')).toBeNull();
    expect(
      relatedPath('https://other.example/article/a', '/article/a')
    ).toBeNull();
    expect(relatedPath('/article', '/article/a')).toBeNull();
  });
});
