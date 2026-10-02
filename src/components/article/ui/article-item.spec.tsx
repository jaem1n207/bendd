import { act, render, screen } from '@testing-library/react';
import {
  StrictMode,
  useRef,
  type ComponentProps,
  type ElementType,
  type ReactNode,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleItem } from '@/components/article/ui/article-item';
import type { ArticleInfo } from '@/components/article/types/article';

const state = vi.hoisted(() => {
  const preference: { reducedMotion: boolean | undefined } = {
    reducedMotion: false,
  };
  const stop = vi.fn();
  const animate = vi.fn(() => Promise.resolve());
  const controls = { stop, start: animate, set: vi.fn() };
  return {
    ...preference,
    inView: true,
    shouldAnimate: true,
    stop,
    animate,
    controls,
  };
});
vi.mock('motion/react', () => ({
  motion: Object.assign((component: ElementType) => component, {
    create: (_component: ElementType) =>
      function AnimatedLink({
        animate: _animate,
        initial: _initial,
        ...props
      }: ComponentProps<'a'> & { animate?: unknown; initial?: boolean }) {
        return <a {...props} />;
      },
    h2: 'h2',
    span: 'span',
    div: 'div',
  }),
  useInView: () => state.inView,
  useAnimation: () => state.controls,
  useAnimate: () => [useRef(null), state.animate],
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/article' }));
vi.mock('@/components/sound', () => ({
  WithSound: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/article/lib/entrance-animation', () => ({
  shouldPlayEntranceAnimation: () => state.shouldAnimate,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => state.reducedMotion,
}));

const article: ArticleInfo & { index: number } = {
  name: '원문 제목',
  summary: '원문 요약',
  publishedAt: '2026.09.26',
  href: '/article',
  index: 0,
};
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
function advanceFrame(time: number) {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  });
}

describe('ArticleItem reduced motion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 100, 600, 48)
    );
    state.reducedMotion = false;
    state.inView = true;
    state.shouldAnimate = true;
    frames = new Map();
    frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
      frames.delete(id);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([true, undefined])(
    'shows originals without scheduling animation for %s',
    preference => {
      state.reducedMotion = preference;
      render(<ArticleItem {...article} />);
      expect(screen.getByRole('heading').textContent).toBe(article.name);
      expect(screen.getByText(article.summary).style.opacity).toBe('1');
      expect(state.animate).not.toHaveBeenCalled();
      expect(frames.size).toBe(0);
    }
  );

  it('cancels real shuffle frames and restores current props without replay', () => {
    const { rerender } = render(<ArticleItem {...article} />);
    advanceFrame(0);
    advanceFrame(80);
    expect(screen.getByRole('heading').textContent).not.toBe(article.name);
    expect(state.animate).toHaveBeenCalledTimes(1);
    state.reducedMotion = true;
    const updated = {
      ...article,
      name: '새 제목',
      summary: '새 요약',
      publishedAt: '2026.09.27',
    };
    rerender(<ArticleItem {...updated} />);
    expect(state.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link').dataset.lineEntrance).toBe('visible');
    expect(frames.size).toBe(0);
    advanceFrame(160);
    expect(screen.getByRole('heading').textContent).toBe(updated.name);
    expect(screen.getByText(updated.summary).style.opacity).toBe('1');
    expect(screen.getByText(updated.publishedAt).style.opacity).toBe('1');
    state.reducedMotion = false;
    rerender(<ArticleItem {...updated} />);
    expect(state.animate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading').textContent).toBe(updated.name);
  });

  it('waits for a confirmed motion preference before starting', () => {
    state.reducedMotion = undefined;
    const { rerender } = render(<ArticleItem {...article} />);
    state.reducedMotion = false;
    rerender(<ArticleItem {...article} />);
    expect(state.animate).toHaveBeenCalledTimes(1);
  });

  it('does not animate a row that was reduced before scrolling into view', () => {
    state.reducedMotion = true;
    state.inView = false;
    const { rerender } = render(<ArticleItem {...article} />);
    state.reducedMotion = false;
    state.inView = true;
    rerender(<ArticleItem {...article} />);
    expect(state.animate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading').textContent).toBe(article.name);
  });

  it('settles safely during Strict Mode cleanup and on unmount', () => {
    const { unmount } = render(
      <StrictMode>
        <ArticleItem {...article} />
      </StrictMode>
    );
    expect(screen.getByRole('heading').textContent).toBe(article.name);
    expect(frames.size).toBe(0);
    unmount();
    expect(frames.size).toBe(0);
  });

  it('fades the complete row with the reference timing', () => {
    render(<ArticleItem {...article} index={2} />);
    expect(state.animate).toHaveBeenCalledExactlyOnceWith({
      opacity: [0, 1],
      transition: { type: 'tween', ease: 'linear', duration: 0.3, delay: 0.2 },
    });
  });

  it('keeps drawing the line after the row fade has finished', async () => {
    render(<ArticleItem {...article} index={2} />);
    const row = screen.getByRole('link');
    expect(row.dataset.lineEntrance).toBe('active');
    expect(row.style.getPropertyValue('--line-stagger-index')).toBe('2');

    await act(() => Promise.resolve());

    expect(row.dataset.entrance).toBe('visible');
    expect(row.dataset.lineEntrance).toBe('active');
  });

  it('caps the line stagger for a long initial list', () => {
    render(<ArticleItem {...article} index={40} />);
    expect(
      screen.getByRole('link').style.getPropertyValue('--line-stagger-index')
    ).toBe('8');
  });

  it('starts a later viewport entry without the document index delay', () => {
    state.inView = false;
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 2000, 600, 48)
    );
    const { rerender } = render(<ArticleItem {...article} index={40} />);
    expect(state.animate).not.toHaveBeenCalled();
    state.inView = true;
    rerender(<ArticleItem {...article} index={40} />);
    expect(state.animate).toHaveBeenCalledExactlyOnceWith({
      opacity: [0, 1],
      transition: { type: 'tween', ease: 'linear', duration: 0.3, delay: 0 },
    });
    expect(
      screen.getByRole('link').style.getPropertyValue('--line-stagger-index')
    ).toBe('0');
  });

  it('keeps already readable content visible when hydration arrives late', () => {
    const style = document.createElement('div').style;
    style.opacity = '1';
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(style);
    render(<ArticleItem {...article} />);
    expect(state.animate).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(screen.getByRole('heading').textContent).toBe(article.name);
  });

  it('shuffles the summary at the same pace as the title', () => {
    const sameLength = { ...article, name: '제목글자', summary: '요약글자' };
    render(<ArticleItem {...sameLength} />);
    advanceFrame(0);
    advanceFrame(500);
    expect(screen.getByRole('heading').textContent).toBe(sameLength.name);
    expect(screen.getByText(sameLength.summary)).toBeTruthy();
  });

  it('restores readable text immediately when the row receives focus', () => {
    render(<ArticleItem {...article} />);
    advanceFrame(0);
    advanceFrame(80);
    act(() => screen.getByRole('link').focus());
    expect(screen.getByRole('link').dataset.lineEntrance).toBe('visible');
    expect(screen.getByRole('heading').textContent).toBe(article.name);
    expect(screen.getByText(article.summary)).toBeTruthy();
    expect(frames.size).toBe(0);
  });

  it('preserves the skip policy for returning from a child route', () => {
    state.shouldAnimate = false;
    render(<ArticleItem {...article} />);
    expect(screen.getByRole('link').dataset.lineEntrance).toBe('visible');
    expect(state.animate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading').textContent).toBe(article.name);
  });
});
