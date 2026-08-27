'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import {
  getTocRailGeometry,
  type TocRailGeometry,
  type TocRailRow,
} from '@/mdx/common/table-of-contents/toc-tree';
import { updateActiveRailRange } from '@/mdx/common/table-of-contents/use-toc';

interface TocRailProps {
  linkCount: number;
}

function measureRail(container: HTMLUListElement): TocRailGeometry {
  const containerTop = container.getBoundingClientRect().top;
  const rows = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('a[data-toc-depth]')
  ).map<TocRailRow>(link => {
    const rect = link.getBoundingClientRect();

    return {
      depth: Number(link.dataset.tocDepth),
      top: rect.top - containerTop + container.scrollTop,
      bottom: rect.bottom - containerTop + container.scrollTop,
    };
  });

  return getTocRailGeometry(rows, container.scrollHeight);
}

function hasSameGeometry(
  current: TocRailGeometry | null,
  next: TocRailGeometry
): boolean {
  return (
    current?.path === next.path &&
    current.width === next.width &&
    current.height === next.height
  );
}

export function TocRail({ linkCount }: TocRailProps) {
  const [geometry, setGeometry] = useState<TocRailGeometry | null>(null);
  const baseRailRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const container = baseRailRef.current?.closest('ul');
    if (!(container instanceof HTMLUListElement)) return;
    const list = container;

    const links = Array.from(
      list.querySelectorAll<HTMLAnchorElement>('a[data-toc-depth]')
    );

    function measure() {
      const nextGeometry = measureRail(list);
      setGeometry(current =>
        hasSameGeometry(current, nextGeometry) ? current : nextGeometry
      );
      updateActiveRailRange(list);
    }

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    links.forEach(link => observer.observe(link));

    return () => observer.disconnect();
  }, [linkCount]);

  const svgProps = {
    'aria-hidden': true,
    className: 'pointer-events-none absolute left-0 top-0 z-0 overflow-visible',
    height: geometry?.height ?? 0,
    viewBox: `0 0 ${geometry?.width ?? 0} ${geometry?.height ?? 0}`,
    width: geometry?.width ?? 0,
  } as const;

  return (
    <li
      aria-hidden="true"
      role="presentation"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-0 overflow-visible"
    >
      <svg {...svgProps} ref={baseRailRef} data-toc-rail="base">
        {geometry?.path && (
          <path
            d={geometry.path}
            fill="none"
            strokeWidth="1"
            strokeLinecap="butt"
            strokeLinejoin="round"
            className="stroke-muted-foreground/20"
          />
        )}
      </svg>
      <svg
        {...svgProps}
        data-toc-rail="active"
        className={`${svgProps.className} toc-active-rail`}
      >
        {geometry?.path && (
          <path
            d={geometry.path}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="butt"
            strokeLinejoin="round"
            className="stroke-primary"
          />
        )}
      </svg>
    </li>
  );
}
