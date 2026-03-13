import { type RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActiveAnchor } from './use-toc';

const ACTIVE_LINK_COUNT = 3;

describe('useActiveAnchor — INP regression tests', () => {
  let containerEl: HTMLDivElement;
  let markerEl: HTMLDivElement;
  let containerRef: RefObject<HTMLElement>;
  let markerRef: RefObject<HTMLElement>;
  let addEventListenerCalls: Array<
    [string, EventListenerOrEventListenerObject, unknown]
  >;
  let originalAddEventListener: typeof window.addEventListener;

  beforeEach(() => {
    containerEl = document.createElement('div');
    markerEl = document.createElement('div');
    document.body.appendChild(containerEl);

    containerRef = { current: containerEl } as RefObject<HTMLElement>;
    markerRef = { current: markerEl } as RefObject<HTMLElement>;

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
    renderHook(() =>
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
    );

    const scrollCall = addEventListenerCalls.find(
      ([type]) => type === 'scroll'
    );

    expect(scrollCall).toBeDefined();
    expect(scrollCall![2]).toEqual(expect.objectContaining({ passive: true }));
  });

  it('should not set up listeners when linkCount is 0', () => {
    renderHook(() => useActiveAnchor(containerRef, markerRef, 0));

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

    renderHook(() =>
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
    );

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
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
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
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
    );
    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useActiveAnchor — multi-highlight regression', () => {
  let containerEl: HTMLDivElement;
  let markerEl: HTMLDivElement;
  let containerRef: RefObject<HTMLElement>;
  let markerRef: RefObject<HTMLElement>;

  beforeEach(() => {
    containerEl = document.createElement('div');
    markerEl = document.createElement('div');
    document.body.appendChild(containerEl);

    containerRef = { current: containerEl } as RefObject<HTMLElement>;
    markerRef = { current: markerEl } as RefObject<HTMLElement>;
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
    vi.restoreAllMocks();
  });

  it('should highlight at most one link at a time', () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    linkA.className = 'text-muted-foreground/70';
    containerEl.appendChild(linkA);

    const linkB = document.createElement('a');
    linkB.href = '#section-b';
    linkB.className = 'text-muted-foreground/70';
    containerEl.appendChild(linkB);

    const linkC = document.createElement('a');
    linkC.href = '#section-c';
    linkC.className = 'text-muted-foreground/70';
    containerEl.appendChild(linkC);

    renderHook(() =>
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
    );

    linkA.classList.add('!text-foreground');
    linkB.classList.add('!text-foreground');

    window.dispatchEvent(new Event('scroll'));

    const highlighted = containerEl.querySelectorAll('.\\!text-foreground');
    expect(highlighted.length).toBeLessThanOrEqual(1);
  });

  it('should remove previous highlight when active heading changes', () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    containerEl.appendChild(linkA);

    const linkB = document.createElement('a');
    linkB.href = '#section-b';
    containerEl.appendChild(linkB);

    renderHook(() =>
      useActiveAnchor(containerRef, markerRef, ACTIVE_LINK_COUNT)
    );

    linkA.classList.add('!text-foreground');

    window.dispatchEvent(new Event('scroll'));

    expect(linkA.classList.contains('!text-foreground')).toBe(false);
  });

  it('should re-initialize when linkCount changes (simulates TOC render)', () => {
    const addScrollSpy = vi.spyOn(window, 'addEventListener');

    const { rerender } = renderHook(
      ({ count }) => useActiveAnchor(containerRef, markerRef, count),
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
      ({ count }) => useActiveAnchor(containerRef, markerRef, count),
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
      ({ count }) => useActiveAnchor(containerRef, markerRef, count),
      { initialProps: { count: 0 } }
    );

    const rafBefore = rafSpy.mock.calls.length;

    rerender({ count: 3 });

    expect(rafSpy.mock.calls.length).toBe(rafBefore + 1);
  });
});
