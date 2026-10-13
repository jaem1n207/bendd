import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TableOfContents } from '@/mdx/common/table-of-contents/table-of-contents';

describe('TableOfContents', () => {
  let doc: HTMLElement;
  let article: HTMLElement;
  let pendingFrame: FrameRequestCallback | undefined;

  const flushFrame = () => {
    const callback = pendingFrame;
    pendingFrame = undefined;
    act(() => callback?.(0));
  };

  const place = (element: Element, top: number, bottom = top) => {
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: top - window.scrollY,
          bottom: bottom - window.scrollY,
        }) as DOMRect
    );
  };

  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      pendingFrame = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      pendingFrame = undefined;
    });

    doc = document.createElement('section');
    doc.id = 'BenddDoc';
    doc.innerHTML =
      '<article><h2 id="first">첫 구간</h2><h2 id="second">두 번째 구간</h2></article>';
    document.body.appendChild(doc);
    article = doc.querySelector('article')!;
    place(doc, 1000);
    place(article, 1200, 3000);
    const headings = article.querySelectorAll('h2');
    place(headings[0], 1500);
    place(headings[1], 2200);
    headings.forEach(heading =>
      vi
        .spyOn(heading, 'getClientRects')
        .mockReturnValue({ length: 1 } as DOMRectList)
    );
  });

  afterEach(() => {
    doc.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pendingFrame = undefined;
  });

  it('maps document sections to proportional rail segments and live reading progress', () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    render(<TableOfContents title="글 제목" />);
    flushFrame();

    const first = screen.getByRole('link', { name: '첫 구간' });
    const second = screen.getByRole('link', { name: '두 번째 구간' });
    expect(first.getAttribute('href')).toBe('#first');
    expect(first.style.top).toBe('25%');
    expect(first.style.height).toBe('35%');
    expect(second.style.top).toBe('60%');
    expect(second.style.height).toBe('40%');
    expect(
      addListener.mock.calls.find(([name]) => name === 'scroll')?.[2]
    ).toEqual({ passive: true });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1688,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    flushFrame();
    expect(first.getAttribute('aria-current')).toBe('location');
    expect(
      (first.querySelector('[aria-hidden] > span') as HTMLElement).style.height
    ).toBe(`${(300 / 700) * 100}%`);
  });

  it('reads replaced headings on the next scroll and updates the active section', () => {
    render(<TableOfContents title="글 제목" />);
    flushFrame();

    const replacement = document.createElement('h2');
    replacement.id = 'replacement';
    replacement.textContent = '바뀐 구간';
    article.querySelector('#second')!.replaceWith(replacement);
    place(replacement, 2100);
    vi.spyOn(replacement, 'getClientRects').mockReturnValue({
      length: 1,
    } as DOMRectList);
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 2300,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    flushFrame();

    expect(screen.queryByRole('link', { name: '두 번째 구간' })).toBeNull();
    expect(
      screen
        .getByRole('link', { name: '바뀐 구간' })
        .getAttribute('aria-current')
    ).toBe('location');
  });
});
