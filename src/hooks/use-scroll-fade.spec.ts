import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useScrollFade } from '@/hooks/use-scroll-fade';

afterEach(() => vi.unstubAllGlobals());

describe('useScrollFade', () => {
  const axes: Array<'x' | 'y'> = ['x', 'y'];
  for (const axis of axes) {
    test(`removes the ${axis} fade when a resized container no longer overflows`, () => {
      let contentSize = 300;
      let onResize = () => {};
      const observe = vi.fn();
      const disconnect = vi.fn();
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            onResize = callback;
          }
          observe = observe;
          disconnect = disconnect;
        }
      );
      const element = document.createElement('div');
      const child = document.createElement('div');
      element.append(child);
      Object.defineProperties(element, {
        clientWidth: { value: 200 },
        clientHeight: { value: 200 },
        scrollWidth: { get: () => (axis === 'x' ? contentSize : 200) },
        scrollHeight: { get: () => (axis === 'y' ? contentSize : 200) },
      });

      const { unmount } = renderHook(() =>
        useScrollFade({ current: element }, axis)
      );
      expect(element.dataset.scrollFadeOverflow).toBe('true');
      expect(observe).toHaveBeenCalledWith(element);
      expect(observe).toHaveBeenCalledWith(child);

      contentSize = 200;
      onResize();
      expect(element.dataset.scrollFadeOverflow).toBe('false');

      contentSize = 400;
      onResize();
      expect(element.dataset.scrollFadeOverflow).toBe('true');

      unmount();
      expect(disconnect).toHaveBeenCalledOnce();
      expect(element.dataset.scrollFadeOverflow).toBeUndefined();
    });
  }

  test('updates after asynchronously loaded items are rendered', () => {
    const element = document.createElement('ul');
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        disconnect() {}
      }
    );
    const ref = { current: element };
    const { rerender } = renderHook(
      ({ count }) => useScrollFade(ref, 'y', count),
      { initialProps: { count: 0 } }
    );
    const item = document.createElement('li');
    element.append(item);

    rerender({ count: 1 });
    expect(observe).toHaveBeenCalledWith(item);
  });
});
