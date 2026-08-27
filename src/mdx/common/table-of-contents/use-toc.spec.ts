import { type RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

import {
  getActiveHeaderLinks,
  getHeaders,
  updateActiveRailRange,
  useActiveAnchor,
} from '@/mdx/common/table-of-contents/use-toc';

const ACTIVE_LINK_COUNT = 3;

describe('getActiveHeaderLinks', () => {
  test('should include the carried section and every visible heading', () => {
    const activeLinks = getActiveHeaderLinks(
      [
        { link: '#previous', top: 100, bottom: 140 },
        { link: '#visible-a', top: 450, bottom: 490 },
        { link: '#visible-b', top: 700, bottom: 740 },
        { link: '#below', top: 950, bottom: 990 },
      ],
      {
        scrollY: 300,
        innerHeight: 600,
        offsetHeight: 2_000,
        scrollOffset: 100,
      }
    );

    expect(activeLinks).toEqual(['#previous', '#visible-a', '#visible-b']);
  });

  test('should use the carried section when no heading is visible', () => {
    const activeLinks = getActiveHeaderLinks(
      [
        { link: '#previous', top: 100, bottom: 140 },
        { link: '#below', top: 1_000, bottom: 1_040 },
      ],
      {
        scrollY: 300,
        innerHeight: 600,
        offsetHeight: 2_000,
        scrollOffset: 100,
      }
    );

    expect(activeLinks).toEqual(['#previous']);
  });

  test('should not activate a carried section at the top before headings appear', () => {
    const activeLinks = getActiveHeaderLinks(
      [{ link: '#below', top: 900, bottom: 940 }],
      {
        scrollY: 0,
        innerHeight: 600,
        offsetHeight: 2_000,
        scrollOffset: 100,
      }
    );

    expect(activeLinks).toEqual([]);
  });
});

function createRailFixture() {
  const container = document.createElement('ul');
  container.scrollTop = 20;
  container.getBoundingClientRect = () => new DOMRect(0, 100, 240, 160);
  Object.defineProperty(container, 'scrollHeight', {
    configurable: true,
    value: 160,
  });

  const links = [
    { top: 110, bottom: 142 },
    { top: 142, bottom: 174 },
    { top: 174, bottom: 206 },
  ].map(({ top, bottom }) => {
    const link = document.createElement('a');
    link.dataset.tocDepth = '0';
    link.dataset.active = 'false';
    link.getBoundingClientRect = () => new DOMRect(0, top, 200, bottom - top);
    container.appendChild(link);
    return link;
  });

  links[1].dataset.active = 'true';

  return { container, links };
}

describe('updateActiveRailRange', () => {
  test('should extend only the top endpoint when an upper heading becomes active', () => {
    const { container, links } = createRailFixture();

    expect(updateActiveRailRange(container)).toEqual({
      topInset: 62,
      bottomInset: 66,
    });

    links[0].dataset.active = 'true';

    expect(updateActiveRailRange(container)).toEqual({
      topInset: 30,
      bottomInset: 66,
    });
    expect(container.style.getPropertyValue('--toc-active-top')).toBe('30px');
    expect(container.style.getPropertyValue('--toc-active-bottom')).toBe(
      '66px'
    );
  });

  test('should extend only the bottom endpoint when a lower heading becomes active', () => {
    const { container, links } = createRailFixture();

    expect(updateActiveRailRange(container)).toEqual({
      topInset: 62,
      bottomInset: 66,
    });

    links[2].dataset.active = 'true';

    expect(updateActiveRailRange(container)).toEqual({
      topInset: 62,
      bottomInset: 34,
    });
    expect(container.style.getPropertyValue('--toc-active-top')).toBe('62px');
    expect(container.style.getPropertyValue('--toc-active-bottom')).toBe(
      '34px'
    );
  });
});

describe('useActiveAnchor — INP regression tests', () => {
  let containerEl: HTMLDivElement;
  let containerRef: RefObject<HTMLElement>;
  let addEventListenerCalls: Array<
    [string, EventListenerOrEventListenerObject, unknown]
  >;
  let originalAddEventListener: typeof window.addEventListener;

  beforeEach(() => {
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);

    containerRef = { current: containerEl };

    addEventListenerCalls = [];
    originalAddEventListener = window.addEventListener.bind(window);
    window.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      addEventListenerCalls.push([type, listener, options]);
      return originalAddEventListener(type, listener, options);
    } as typeof window.addEventListener;
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    document.body.removeChild(containerEl);
    vi.restoreAllMocks();
  });

  it('should register scroll listener with passive: true', () => {
    renderHook(() => useActiveAnchor(containerRef, ACTIVE_LINK_COUNT));

    const scrollCall = addEventListenerCalls.find(
      ([type]) => type === 'scroll'
    );

    expect(scrollCall).toBeDefined();
    expect(scrollCall![2]).toEqual(expect.objectContaining({ passive: true }));
  });

  it('should not set up listeners when linkCount is 0', () => {
    renderHook(() => useActiveAnchor(containerRef, 0));

    const scrollCall = addEventListenerCalls.find(
      ([type]) => type === 'scroll'
    );

    expect(scrollCall).toBeUndefined();
  });

  it('should skip DOM mutations when active hash has not changed', () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    containerEl.appendChild(linkA);

    const querySelectorAllSpy = vi.spyOn(containerEl, 'querySelectorAll');

    renderHook(() => useActiveAnchor(containerRef, ACTIVE_LINK_COUNT));

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    const totalQueryCalls = querySelectorAllSpy.mock.calls.filter(
      ([selector]) => selector === 'a'
    ).length;

    expect(totalQueryCalls).toBeLessThanOrEqual(2);
  });

  it('should clean up scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useActiveAnchor(containerRef, ACTIVE_LINK_COUNT)
    );
    unmount();

    const scrollRemoveCall = removeEventListenerSpy.mock.calls.find(
      ([event]) => event === 'scroll'
    );
    expect(scrollRemoveCall).toBeDefined();
  });

  it('should cancel rAF on unmount', () => {
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = renderHook(() =>
      useActiveAnchor(containerRef, ACTIVE_LINK_COUNT)
    );
    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useActiveAnchor — multi-highlight regression', () => {
  let containerEl: HTMLDivElement;
  let containerRef: RefObject<HTMLElement>;

  beforeEach(() => {
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);

    containerRef = { current: containerEl };
  });

  afterEach(() => {
    document.getElementById('BenddDoc')?.remove();
    document.body.removeChild(containerEl);
    vi.restoreAllMocks();
  });

  it('should highlight the carried section and every visible heading', async () => {
    const documentEl = document.createElement('div');
    documentEl.id = 'BenddDoc';
    document.body.appendChild(documentEl);

    const headingPositions = [
      { id: 'previous', top: -200, bottom: -160 },
      { id: 'visible-a', top: 150, bottom: 190 },
      { id: 'visible-b', top: 400, bottom: 440 },
    ];

    for (const { id, top, bottom } of headingPositions) {
      const heading = document.createElement('h2');
      heading.id = id;
      heading.innerHTML = `<a class="header-anchor">${id}</a>`;
      heading.getBoundingClientRect = vi.fn(
        () => new DOMRect(0, top, 0, bottom - top)
      );
      documentEl.appendChild(heading);

      const link = document.createElement('a');
      link.href = `#${id}`;
      containerEl.appendChild(link);
    }

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);

    getHeaders([2, 4]);
    renderHook(() => useActiveAnchor(containerRef, ACTIVE_LINK_COUNT));

    window.dispatchEvent(new Event('scroll'));

    await vi.waitFor(() => {
      const highlighted = containerEl.querySelectorAll('.\\!text-foreground');
      expect(highlighted).toHaveLength(3);
    });
  });

  it('should remove previous highlight when active heading changes', async () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    containerEl.appendChild(linkA);

    const linkB = document.createElement('a');
    linkB.href = '#section-b';
    containerEl.appendChild(linkB);

    renderHook(() => useActiveAnchor(containerRef, ACTIVE_LINK_COUNT));

    linkA.classList.add('!text-foreground');

    window.dispatchEvent(new Event('scroll'));

    await vi.waitFor(() => {
      expect(linkA.classList.contains('!text-foreground')).toBe(false);
    });
  });

  it('should synchronize the rail range before enabling its transition', async () => {
    const documentEl = document.createElement('div');
    documentEl.id = 'BenddDoc';
    document.body.appendChild(documentEl);

    const heading = document.createElement('h2');
    heading.id = 'visible';
    heading.innerHTML = '<a class="header-anchor">visible</a>';
    heading.getBoundingClientRect = () => new DOMRect(0, 120, 0, 40);
    documentEl.appendChild(heading);

    const link = document.createElement('a');
    link.href = '#visible';
    link.dataset.tocDepth = '0';
    link.dataset.active = 'false';
    link.getBoundingClientRect = () => new DOMRect(0, 110, 200, 32);
    containerEl.appendChild(link);

    containerEl.getBoundingClientRect = () => new DOMRect(0, 100, 240, 100);
    Object.defineProperty(containerEl, 'scrollHeight', {
      configurable: true,
      value: 100,
    });

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);

    getHeaders([2, 4]);
    renderHook(() => useActiveAnchor(containerRef, 1));

    await vi.waitFor(() => {
      expect(containerEl.style.getPropertyValue('--toc-active-top')).toBe(
        '10px'
      );
      expect(containerEl.style.getPropertyValue('--toc-active-bottom')).toBe(
        '58px'
      );
      expect(containerEl.dataset.tocRailReady).toBe('true');
    });
  });

  it('should re-initialize when linkCount changes (simulates TOC render)', () => {
    const addScrollSpy = vi.spyOn(window, 'addEventListener');

    const { rerender } = renderHook(
      ({ count }) => useActiveAnchor(containerRef, count),
      { initialProps: { count: 0 } }
    );

    const scrollCallsBefore = addScrollSpy.mock.calls.filter(
      ([type]) => type === 'scroll'
    ).length;
    expect(scrollCallsBefore).toBe(0);

    rerender({ count: 5 });

    const scrollCallsAfter = addScrollSpy.mock.calls.filter(
      ([type]) => type === 'scroll'
    ).length;
    expect(scrollCallsAfter).toBe(1);
  });

  it('should clean up previous effect when linkCount changes', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const { rerender } = renderHook(
      ({ count }) => useActiveAnchor(containerRef, count),
      { initialProps: { count: 3 } }
    );

    removeListenerSpy.mockClear();
    cancelRafSpy.mockClear();

    rerender({ count: 5 });

    const scrollRemoves = removeListenerSpy.mock.calls.filter(
      ([type]) => type === 'scroll'
    );
    expect(scrollRemoves.length).toBe(1);
    expect(cancelRafSpy).toHaveBeenCalledTimes(1);
  });

  it('should schedule rAF on linkCount change for immediate highlight', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    const { rerender } = renderHook(
      ({ count }) => useActiveAnchor(containerRef, count),
      { initialProps: { count: 0 } }
    );

    const rafBefore = rafSpy.mock.calls.length;

    rerender({ count: 3 });

    expect(rafSpy.mock.calls.length).toBe(rafBefore + 1);
  });
});
