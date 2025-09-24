'use client';

import { type Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { MenuItem } from './toc';
import { getHeaders, useActiveAnchor } from './use-toc';

export function TableOfContents() {
  const [toc, setToc] = useState<MenuItem[]>([]);
  const containerRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useActiveAnchor(
    containerRef as React.RefObject<HTMLElement>,
    markerRef as React.RefObject<HTMLElement>
  );

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  return (
    <nav className="toc-navbar bd:mt-6">
      <div
        ref={markerRef}
        className={cn(
          'bd:absolute bd:-left-px bd:top-10 bd:z-0 bd:h-3 bd:w-0.5 bd:rounded-xs bd:bg-primary bd:opacity-0',
          'bd:transition-[opacity,top,background-color] bd:motion-reduce:transition-none bd:motion-reduce:hover:transition-none'
        )}
      />
      <Typography variant="small" className="bd:!leading-8">
        On this page
      </Typography>
      <ul
        ref={containerRef}
        className={cn(
          'bd:h-full bd:overflow-y-auto bd:mt-1 bd:rounded-xs bd:font-sans'
        )}
      >
        {renderItems(toc)}
      </ul>
    </nav>
  );
}

function renderItems(items: MenuItem[]) {
  return items.map(item => (
    <li key={item.link} className="bd:py-1">
      <Link
        href={item.link as Route<''>}
        className={cn(
          'bd:block bd:text-sm bd:font-medium bd:transition-colors bd:hover:text-foreground bd:truncate',
          'bd:text-muted-foreground/70'
        )}
      >
        {item.title}
      </Link>
      {item.children && item.children.length > 0 && (
        <ul className="bd:ml-4 bd:mt-1">{renderItems(item.children)}</ul>
      )}
    </li>
  ));
}
