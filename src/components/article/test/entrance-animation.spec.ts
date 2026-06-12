import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPreviousPathname } from '@/components/navigation';
import { shouldPlayEntranceAnimation } from '../lib/entrance-animation';

vi.mock('@/components/navigation', () => ({
  getPreviousPathname: vi.fn(),
}));

const mockGetPreviousPathname = vi.mocked(getPreviousPathname);

describe('shouldPlayEntranceAnimation', () => {
  beforeEach(() => {
    mockGetPreviousPathname.mockReset();
  });

  it('직전 경로가 없으면(새로고침·직접 진입) 재생한다', () => {
    mockGetPreviousPathname.mockReturnValue(null);

    expect(shouldPlayEntranceAnimation('/article')).toBe(true);
  });

  it('글 상세에서 목록으로 돌아오면 생략한다', () => {
    mockGetPreviousPathname.mockReturnValue('/article/some-post');

    expect(shouldPlayEntranceAnimation('/article')).toBe(false);
  });

  it('시리즈 등 더 깊은 하위 경로에서 돌아와도 생략한다', () => {
    mockGetPreviousPathname.mockReturnValue('/article/series/frontend');

    expect(shouldPlayEntranceAnimation('/article')).toBe(false);
  });

  it('다른 섹션에서 넘어오면 재생한다', () => {
    mockGetPreviousPathname.mockReturnValue('/craft');

    expect(shouldPlayEntranceAnimation('/article')).toBe(true);
  });

  it('다른 섹션의 상세에서 넘어와도 재생한다', () => {
    mockGetPreviousPathname.mockReturnValue('/craft/some-work');

    expect(shouldPlayEntranceAnimation('/article')).toBe(true);
  });

  it('접두사만 같은 형제 경로는 하위 경로로 오인하지 않는다', () => {
    mockGetPreviousPathname.mockReturnValue('/article-archive');

    expect(shouldPlayEntranceAnimation('/article')).toBe(true);
  });
});
