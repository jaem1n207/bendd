'use client';

import { ListTree } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { FluidHover } from '@/components/ui/fluid-hover';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { TocRail } from '@/mdx/common/table-of-contents/toc-rail';
import type { MenuItem } from '@/mdx/common/table-of-contents/toc';
import {
  flattenMenuItems,
  getTocRailPadding,
} from '@/mdx/common/table-of-contents/toc-tree';
import {
  getHeaders,
  useActiveAnchor,
} from '@/mdx/common/table-of-contents/use-toc';

export function TableOfContents() {
  const [toc, setToc] = useState<MenuItem[]>([]);
  const containerRef = useRef<HTMLUListElement>(null);
  const flatToc = flattenMenuItems(toc);

  useActiveAnchor(containerRef, flatToc.length);

  useEffect(() => {
    setToc(getHeaders([2, 4]));
  }, []);

  return (
    <nav
      aria-labelledby="table-of-contents-heading"
      className="toc-navbar flex max-h-full min-h-0 min-w-0 flex-col self-start overflow-hidden"
    >
      <div className="mt-6 flex items-center gap-1.5 text-muted-foreground">
        <ListTree aria-hidden="true" className="size-3.5 shrink-0" />
        <Typography
          id="table-of-contents-heading"
          variant="p"
          affects="small"
          asChild
          className="!mt-0 !leading-5"
        >
          <p>On this page</p>
        </Typography>
      </div>
      <FluidHover highlightClassName="rounded-sm bg-muted/50">
        <ul
          ref={containerRef}
          className={cn(
            'relative mt-2 min-h-0 flex-1 overflow-y-auto rounded-sm py-1 font-sans'
          )}
        >
          <TocRail linkCount={flatToc.length} />
          {flatToc.map(({ item, depth }) => (
            <TableOfContentsItem key={item.link} item={item} depth={depth} />
          ))}
        </ul>
      </FluidHover>
    </nav>
  );
}

interface TableOfContentsItemProps {
  item: MenuItem;
  depth: number;
}

function TableOfContentsItem({ item, depth }: TableOfContentsItemProps) {
  return (
    <li aria-level={depth + 1}>
      <Link
        href={{ hash: item.link.slice(1) }}
        data-fluid-hover-item=""
        data-active="false"
        data-toc-depth={depth}
        style={{ paddingInlineStart: getTocRailPadding(depth) }}
        className={cn(
          'group relative block max-w-full break-keep py-1.5 text-sm font-medium leading-5',
          'text-muted-foreground/70 transition-colors data-[fluid-hover-active]:text-foreground',
          'data-[active=true]:!text-foreground'
        )}
      >
        <span className="relative z-10">{item.title}</span>
      </Link>
    </li>
  );
}
