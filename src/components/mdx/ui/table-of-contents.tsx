'use client';

import { Paragraph } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHeaders, useActiveAnchor } from '../hook/use-toc';
import type { MenuItem } from '../types/toc';

export function TableOfContents() {
  const [toc, setToc] = useState<MenuItem[]>([]);
  const containerRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  useActiveAnchor(containerRef, markerRef);

  const renderItems = useCallback((items: MenuItem[]) => {
    return items.map(item => (
      <li key={item.link} className="bd-py-1">
        <Link
          href={item.link}
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
      <Paragraph size="sm" className="!bd-leading-8">
        On this page
      </Paragraph>
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
