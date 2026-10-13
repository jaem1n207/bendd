import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TableOfContents } from '@/mdx/common/table-of-contents/table-of-contents';

describe('TableOfContents', () => {
  let doc: HTMLElement;
  let article: HTMLElement;
  let pendingFrame: FrameRequestCallback | undefined;

  const flushFrameAt = (time: number) => {
    const callback = pendingFrame;
    pendingFrame = undefined;
    act(() => callback?.(time));
  };
  const flushFrame = () => flushFrameAt(0);

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
    window.history.replaceState(null, '', window.location.pathname);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });
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

  it('finishes a mouse click with a short smooth scroll and updates its hash', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const pushState = vi.spyOn(window.history, 'pushState');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    fireEvent.click(screen.getByRole('link', { name: '두 번째 구간' }), {
      detail: 1,
    });
    expect(pushState).toHaveBeenCalledWith(null, '', '#second');
    flushFrame();
    flushFrameAt(240);
    expect(scrollTo).toHaveBeenCalled();
    const middle = scrollTo.mock.lastCall?.[1] as number;
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(2200);
    flushFrameAt(520);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 2200);
  });

  it('keeps the heading clear of the sticky header during the scroll', () => {
    const target = article.querySelector<HTMLElement>('#second')!;
    target.style.scrollMarginTop = '112px';
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );

    render(<TableOfContents title="글 제목" />);
    flushFrame();
    fireEvent.click(screen.getByRole('link', { name: '두 번째 구간' }), {
      detail: 1,
    });
    flushFrame();
    flushFrameAt(520);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 2088);
  });

  it('allows a wheel gesture to interrupt an animated click', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );

    render(<TableOfContents title="글 제목" />);
    flushFrame();
    fireEvent.click(screen.getByRole('link', { name: '두 번째 구간' }), {
      detail: 1,
    });
    flushFrame();
    flushFrameAt(100);
    const callsBeforeWheel = scrollTo.mock.calls.length;
    fireEvent.wheel(window);
    flushFrameAt(520);
    expect(scrollTo).toHaveBeenCalledTimes(callsBeforeWheel);
  });

  it('moves immediately for keyboard activation or reduced motion', () => {
    const target = article.querySelector<HTMLElement>('#first')!;
    target.scrollIntoView = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );

    render(<TableOfContents title="글 제목" />);
    flushFrame();
    fireEvent.click(screen.getByRole('link', { name: '첫 구간' }), {
      detail: 0,
    });
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'start',
    });

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    fireEvent.click(screen.getByRole('link', { name: '첫 구간' }), {
      detail: 1,
    });
    expect(target.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'instant',
      block: 'start',
    });
  });

  it('adds h3 headings as subordinate rail segments in reading order', () => {
    const subheading = document.createElement('h3');
    subheading.id = 'subsection';
    subheading.textContent = '첫 하위 구간';
    article.querySelector('#second')!.before(subheading);
    place(subheading, 1800);
    vi.spyOn(subheading, 'getClientRects').mockReturnValue({
      length: 1,
    } as DOMRectList);

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    const links = screen.getAllByRole('link');
    expect(links.map(link => link.getAttribute('aria-label'))).toEqual([
      '글 제목',
      '첫 구간',
      '첫 하위 구간',
      '두 번째 구간',
    ]);
    expect(links[1].style.height).toBe('15%');
    expect(links[2].style.top).toBe('40%');
    expect(links[2].style.height).toBe('20%');
    expect(links[1].getAttribute('data-depth')).toBe('0');
    expect(links[2].getAttribute('data-depth')).toBe('1');
    expect(links[2].getAttribute('href')).toBe('#subsection');
  });

  it('fills every segment at the bottom of the page', () => {
    place(article, 1200, 3800);
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 4000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 3000,
    });

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    for (const link of screen.getAllByRole('link')) {
      expect(
        (link.querySelector('[aria-hidden] > span') as HTMLElement).style.height
      ).toBe('100%');
    }
  });

  it('maps the rail to the article when content follows it', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 4000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    const rail = screen.getByRole('navigation', { name: '글 목차' });
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 820,
      height: 720,
    } as DOMRect);
    const track = screen
      .getByRole('link', { name: '첫 구간' })
      .querySelector('[aria-hidden] > span')?.parentElement as HTMLElement;
    track.setPointerCapture = vi.fn();

    const pointerDown = new MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientY: 460,
    });
    Object.defineProperty(pointerDown, 'pointerId', { value: 1 });
    fireEvent(track, pointerDown);
    expect(track.setPointerCapture).toHaveBeenCalledWith(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 1888);
  });

  it('marks only passed sections for highlighted labels', () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1688,
    });
    render(<TableOfContents title="글 제목" />);
    flushFrame();

    expect(
      screen.getByRole('link', { name: '글 제목' }).getAttribute('data-passed')
    ).toBe('true');
    expect(
      screen.getByRole('link', { name: '첫 구간' }).getAttribute('data-passed')
    ).toBe('false');
    expect(
      screen
        .getByRole('link', { name: '두 번째 구간' })
        .getAttribute('data-passed')
    ).toBe('false');

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 2300,
    });
    act(() => window.dispatchEvent(new Event('scroll')));
    flushFrame();
    expect(
      screen.getByRole('link', { name: '첫 구간' }).getAttribute('data-passed')
    ).toBe('true');
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

  it('hides the rail when the article has no headings', () => {
    article.replaceChildren();

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    expect(screen.queryByRole('navigation', { name: '글 목차' })).toBeNull();
  });

  it('keeps complete long labels in the existing rail without a tooltip', () => {
    const title =
      '모바일과 데스크톱에서 읽기 진행과 목차 링크를 함께 동기화하는 방법?';
    const heading =
      'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a';
    article.querySelector('#first')!.textContent = heading;

    render(<TableOfContents title={title} />);
    flushFrame();

    const titleLink = screen.getByRole('link', { name: title });
    const headingLink = screen.getByRole('link', { name: heading });
    expect(titleLink.querySelector('[data-toc-tooltip]')).toBeNull();
    expect(headingLink.querySelector('[data-toc-tooltip]')).toBeNull();
    expect(titleLink.querySelector('span')?.textContent).toBe(title);
    expect(headingLink.querySelector('span')?.textContent).toBe(heading);
  });

  it('groups a dense rail and keeps every heading in an expandable list', () => {
    place(article, 1200, 3200);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 1000; index++) {
      const heading = document.createElement('h3');
      heading.id = `section-${index}`;
      heading.textContent = `참고 항목 ${index}`;
      place(heading, 1201 + index * 2);
      vi.spyOn(heading, 'getClientRects').mockReturnValue({
        length: 1,
      } as DOMRectList);
      fragment.appendChild(heading);
    }
    article.replaceChildren(fragment);

    render(<TableOfContents title="글 제목" />);
    flushFrame();

    const rail = screen.getByRole('navigation', { name: '글 목차' });
    const railLinks = rail.querySelectorAll('a[data-toc-rail-link]');
    expect(railLinks.length).toBeLessThan(100);
    expect(railLinks.length).toBeGreaterThan(1);
    expect(
      [...railLinks].every(
        link => parseFloat((link as HTMLElement).style.height) > 2.5
      )
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /전체 목차/ }));
    expect(rail.querySelectorAll('[data-toc-full-list] a')).toHaveLength(1001);

    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    fireEvent.click(
      rail.querySelector('[data-toc-full-list] a[href="#section-999"]')!,
      { detail: 1 }
    );
    flushFrame();
    flushFrameAt(520);
    expect(scrollTo).toHaveBeenCalled();
    expect(rail.querySelector('[data-toc-full-list]')).toBeNull();
  });
});
