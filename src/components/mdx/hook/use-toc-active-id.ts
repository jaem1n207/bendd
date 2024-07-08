import { querySelectorAll } from '@/lib/dom';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useTocActiveId() {
  const [activeId, setActiveId] = useState<string>('');
  const headingRefs = useRef<Map<string, IntersectionObserverEntry>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        headingRefs.current.set(entry.target.id, entry);
      });

      const visibleHeadings: IntersectionObserverEntry[] = [];
      headingRefs.current.forEach(entry => {
        if (entry.isIntersecting) visibleHeadings.push(entry);
      });

      if (visibleHeadings.length > 0) {
        const topMostVisibleHeading = visibleHeadings.reduce(
          (prev, current) => {
            return prev.boundingClientRect.top > current.boundingClientRect.top
              ? current
              : prev;
          }
        );

        setActiveId(topMostVisibleHeading.target.id);
      }
    },
    []
  );

  useEffect(() => {
    const headingElements = Array.from(querySelectorAll('h2, h3, h4'));

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: '0px 0px -40% 0px',
      threshold: [0, 0.5],
    });

    headingElements.forEach(element => {
      if (element === null) return;
      observerRef.current?.observe(element);
    });

    return () => observerRef.current?.disconnect();
  }, [handleIntersection]);

  return { activeId };
}
