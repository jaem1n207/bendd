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

  useActiveAnchor(containerRef, markerRef);

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  return (
    <nav className="toc-navbar">
      <div
        ref={markerRef}
        className={cn(
          'bd-absolute -bd-left-px bd-top-10 bd-z-0 bd-h-3 bd-w-0.5 bd-rounded-sm bd-bg-primary bd-opacity-0',
          'bd-transition-[opacity,top,background-color] motion-reduce:bd-transition-none motion-reduce:hover:bd-transition-none'
        )}
      />
      <Typography variant="p" affects="small" asChild className="!bd-leading-8">
        <p>On this page</p>
      </Typography>
      <ul
        ref={containerRef}
        className={cn(
          'bd-h-full bd-overflow-y-auto bd-mt-1 bd-rounded-sm bd-font-sans'
        )}
      >
        {renderItems(toc)}
      </ul>
    </nav>
  );
}

function renderItems(items: MenuItem[]) {
  return items.map(item => (
    <li key={item.link} className="bd-py-1">
      <Link
        href={item.link as Route<''>}
        className={cn(
          'bd-block bd-text-sm bd-font-medium bd-transition-colors hover:bd-text-foreground bd-truncate',
          'bd-text-muted-foreground/70'
        )}
      >
        {item.title}
      </Link>
      {item.children && item.children.length > 0 && (
        <ul className="bd-ml-4 bd-mt-1">{renderItems(item.children)}</ul>
      )}
    </li>
  ));
}
