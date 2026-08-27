'use client';

import { ListTree } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/mdx/common/table-of-contents/toc';
import {
  flattenMenuItems,
  getConnectorGeometry,
  type ConnectorGeometry,
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
      <ul
        ref={containerRef}
        className={cn(
          'relative mt-2 min-h-0 flex-1 overflow-y-auto rounded-sm py-1 font-sans'
        )}
      >
        {flatToc.map(({ item, depth }, index) => {
          const previousDepth = flatToc[index - 1]?.depth ?? depth;

          return (
            <TableOfContentsItem
              key={item.link}
              item={item}
              depth={depth}
              geometry={getConnectorGeometry(depth, previousDepth)}
            />
          );
        })}
      </ul>
    </nav>
  );
}

interface TableOfContentsItemProps {
  item: MenuItem;
  depth: number;
  geometry: ConnectorGeometry;
}

function TableOfContentsItem({
  item,
  depth,
  geometry,
}: TableOfContentsItemProps) {
  return (
    <li aria-level={depth + 1}>
      <Link
        href={{ hash: item.link.slice(1) }}
        data-active="false"
        style={{ paddingInlineStart: geometry.paddingInlineStart }}
        className={cn(
          'group relative block max-w-full break-keep py-1.5 text-sm font-medium leading-5',
          'text-muted-foreground/70 transition-colors hover:text-foreground',
          'data-[active=true]:!text-foreground'
        )}
      >
        <TocConnector geometry={geometry} />
        <span className="relative z-10">{item.title}</span>
      </Link>
    </li>
  );
}

interface TocConnectorProps {
  geometry: ConnectorGeometry;
}

function TocConnector({ geometry }: TocConnectorProps) {
  const { lineX, lineStartY, transitionPath, width } = geometry;
  const baseStrokeClassName = 'stroke-muted-foreground/20';
  const activeStrokeClassName = cn(
    'stroke-primary opacity-0 [stroke-dashoffset:1]',
    'transition-[opacity,stroke-dashoffset] duration-200 [transition-timing-function:cubic-bezier(0.77,0,0.175,1)]',
    'group-data-[active=true]:opacity-100 group-data-[active=true]:[stroke-dashoffset:0]',
    'motion-reduce:transition-none motion-reduce:[stroke-dashoffset:0]'
  );

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 z-0 h-full overflow-visible"
      style={{ width }}
    >
      {transitionPath && (
        <>
          <path
            d={transitionPath}
            fill="none"
            strokeWidth="1"
            strokeLinecap="butt"
            strokeLinejoin="round"
            className={baseStrokeClassName}
          />
          <path
            d={transitionPath}
            pathLength={1}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="butt"
            strokeLinejoin="round"
            strokeDasharray={1}
            strokeDashoffset={1}
            className={activeStrokeClassName}
          />
        </>
      )}
      <line
        x1={lineX}
        y1={lineStartY}
        x2={lineX}
        y2="100%"
        strokeWidth="1"
        strokeLinecap="butt"
        className={baseStrokeClassName}
      />
      <line
        x1={lineX}
        y1={lineStartY}
        x2={lineX}
        y2="100%"
        pathLength={1}
        strokeWidth="1.5"
        strokeLinecap="butt"
        strokeDasharray={1}
        strokeDashoffset={1}
        className={activeStrokeClassName}
      />
    </svg>
  );
}
