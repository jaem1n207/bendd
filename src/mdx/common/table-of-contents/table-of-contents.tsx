'use client';

import { type Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/mdx/common/table-of-contents/toc';
import {
  getHeaders,
  useActiveAnchor,
} from '@/mdx/common/table-of-contents/use-toc';

export function TableOfContents() {
  const [toc, setToc] = useState<MenuItem[]>([]);
  const containerRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useActiveAnchor(containerRef, markerRef, toc.length);

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  return (
    <nav className="toc-navbar flex min-h-0 min-w-0 flex-1 flex-col">
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
          'mt-1 min-h-0 flex-1 overflow-y-auto rounded-sm font-sans'
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
          'block max-w-full break-keep text-sm font-medium leading-5 transition-colors hover:text-foreground',
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
