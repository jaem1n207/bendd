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

  useActiveAnchor(containerRef, markerRef, toc.length);

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  return (
    <nav className="toc-navbar flex-1 min-h-0 flex flex-col">
      <div
        ref={markerRef}
        className={cn(
          'absolute -left-px top-10 z-0 h-3 w-0.5 rounded-sm bg-primary opacity-0',
          'transition-[opacity,top,background-color] motion-reduce:transition-none motion-reduce:hover:transition-none'
        )}
      />
      <Typography variant="p" affects="small" asChild className="!leading-8">
        <p>On this page</p>
      </Typography>
      <ul
        ref={containerRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto mt-1 rounded-sm font-sans'
        )}
      >
        {renderItems(toc)}
      </ul>
    </nav>
  );
}

function renderItems(items: MenuItem[]) {
  return items.map(item => (
    <li key={item.link} className="py-1">
      <Link
        href={item.link as Route<''>}
        className={cn(
          'block text-sm font-medium transition-colors hover:text-foreground truncate',
          'text-muted-foreground/70'
        )}
      >
        {item.title}
      </Link>
      {item.children && item.children.length > 0 && (
        <ul className="ml-4 mt-1">{renderItems(item.children)}</ul>
      )}
    </li>
  ));
}
