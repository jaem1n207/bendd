import { type RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActiveAnchor } from './use-toc';

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
    renderHook(() => useActiveAnchor(containerRef, markerRef));

    const scrollCall = addEventListenerCalls.find(
      ([type]) => type === 'scroll'
    );

    expect(scrollCall).toBeDefined();
    expect(scrollCall![2]).toEqual(expect.objectContaining({ passive: true }));
  });

  it('should cache link queries instead of re-querying on every scroll', () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    containerEl.appendChild(linkA);

    const querySelectorAllSpy = vi.spyOn(containerEl, 'querySelectorAll');

    renderHook(() => useActiveAnchor(containerRef, markerRef));

    const callCountAfterMount = querySelectorAllSpy.mock.calls.filter(
      ([selector]) => selector === 'a'
    ).length;

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    const totalQueryCalls = querySelectorAllSpy.mock.calls.filter(
      ([selector]) => selector === 'a'
    ).length;

    expect(totalQueryCalls).toBeLessThanOrEqual(callCountAfterMount + 1);
  });

  it('should skip DOM mutations when active hash has not changed', () => {
    const linkA = document.createElement('a');
    linkA.href = '#section-a';
    containerEl.appendChild(linkA);

    const classListRemoveSpy = vi.spyOn(linkA.classList, 'remove');

    renderHook(() => useActiveAnchor(containerRef, markerRef));

    const removeCountAfterMount = classListRemoveSpy.mock.calls.length;

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(classListRemoveSpy.mock.calls.length).toBeLessThanOrEqual(
      removeCountAfterMount + 1
    );
  });

  it('should clean up scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useActiveAnchor(containerRef, markerRef)
    );
    unmount();

    const scrollRemoveCall = removeEventListenerSpy.mock.calls.find(
      ([event]) => event === 'scroll'
    );
    expect(scrollRemoveCall).toBeDefined();
  });
});
