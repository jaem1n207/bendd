'use client';

import { useEffect, type RefObject } from 'react';

/** CSS owns scroll progress; only measure overflow when content/viewport size changes. */
export function useScrollFade(
  ref: RefObject<HTMLElement | null>,
  axis: 'x' | 'y',
  itemCount = 0
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateOverflow = () => {
      const overflows =
        axis === 'x'
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight;
      element.dataset.scrollFadeOverflow = String(overflows);
    };

    updateOverflow();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateOverflow);
    observer?.observe(element);
    // Child sizes can change while the scroll viewport stays the same size.
    for (const child of element.children) {
      observer?.observe(child);
    }

    return () => {
      observer?.disconnect();
      delete element.dataset.scrollFadeOverflow;
    };
  }, [ref, axis, itemCount]);
}
