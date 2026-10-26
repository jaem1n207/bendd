import { act, render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleItem } from '@/components/article/ui/article-item';
import type { ArticleInfo } from '@/components/article/types/article';

const state = vi.hoisted(() => ({ reducedMotion: false }));

// Keep Motion's real controls and mount/cleanup order.
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useInView: () => true,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/craft' }));
vi.mock('@/components/sound', () => ({
  WithSound: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/article/lib/entrance-animation', () => ({
  shouldPlayEntranceAnimation: () => true,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => state.reducedMotion,
}));

const article: ArticleInfo & { index: number } = {
  name: '탭 전환 제작기',
  summary: '개인용 도구를 만든 과정',
  publishedAt: '2026.10.24',
  href: '/craft',
  index: 2,
};

beforeEach(() => {
  state.reducedMotion = false;
});

describe('ArticleItem Motion lifecycle', () => {
  it('leaves the list during its entrance without calling unmounted controls', () => {
    const { rerender } = render(<ArticleItem {...article} />);
    expect(screen.getByRole('link').dataset.entrance).toBe('active');

    expect(() => rerender(<article>상세 글</article>)).not.toThrow();

    expect(screen.getByText('상세 글')).toBeTruthy();
  });

  it('survives Strict Mode effect cleanup and subsequent unmount', () => {
    const { unmount } = render(
      <StrictMode>
        <ArticleItem {...article} />
      </StrictMode>
    );

    expect(screen.getByRole('heading').textContent).toBe(article.name);
    expect(() => unmount()).not.toThrow();
  });

  it('settles a mounted row on focus and when reduced motion changes', () => {
    const { rerender, unmount } = render(<ArticleItem {...article} />);
    const row = screen.getByRole('link');

    act(() => row.focus());
    expect(row.style.opacity).toBe('1');
    expect(row.dataset.entrance).toBe('visible');
    expect(screen.getByRole('heading').textContent).toBe(article.name);

    state.reducedMotion = true;
    expect(() => rerender(<ArticleItem {...article} />)).not.toThrow();
    expect(row.style.opacity).toBe('1');
    expect(() => unmount()).not.toThrow();
  });
});
