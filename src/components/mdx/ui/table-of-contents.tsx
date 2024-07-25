'use client';

import { motion } from 'framer-motion';
import { useCallback, useRef } from 'react';

import { Paragraph } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTocActiveId } from '../hook/use-toc-active-id';
import type { TOCSection } from '../types/toc';

export function TableOfContents({
  toc,
  className,
}: {
  toc: TOCSection[];
  className?: string;
}) {
  const { activeId } = useTocActiveId();
  const containerRef = useRef<HTMLUListElement>(null);

  const getItemPosition = useCallback((id: string): number => {
    if (!containerRef.current) return 0;
    const item = containerRef.current.querySelector(`a[href="#${id}"]`);
    return item
      ? item.getBoundingClientRect().top -
          containerRef.current.getBoundingClientRect().top
      : 0;
  }, []);

  return (
    <nav className="bd-relative bd-border-l bd-border-solid bd-border-border bd-pl-4">
      <motion.div
        className="bd-absolute -bd-left-px bd-top-10 bd-h-3 bd-w-0.5 bd-bg-primary"
        initial={{ opacity: 0 }}
        animate={{
          opacity: activeId ? 1 : 0,
          y: getItemPosition(activeId),
        }}
      />
      <Paragraph size="sm" className="!bd-leading-8">
        On this page
      </Paragraph>
      <ul
        ref={containerRef}
        className={cn(
          'bd-h-full bd-overflow-y-auto bd-mt-1 bd-rounded-sm bd-font-sans',
          className
        )}
      >
        {toc.map(section => {
          return (
            <li key={section.slug} className="bd-py-1">
              <Link
                href={`#${section.slug}`}
                className={cn(
                  'bd-block bd-text-sm bd-font-medium bd-transition-colors hover:bd-text-foreground bd-truncate',
                  activeId === section.slug
                    ? 'bd-text-foreground'
                    : 'bd-text-muted-foreground/70'
                )}
              >
                {section.text}
              </Link>
              {section.subSections.length > 0 && (
                <ul className="bd-ml-4 bd-mt-1">
                  {section.subSections.map(subSection => (
                    <li key={subSection.slug} className="bd-py-1">
                      <Link
                        href={`#${subSection.slug}`}
                        className={cn(
                          'bd-block bd-text-xs bd-font-medium bd-transition-colors hover:bd-text-foreground bd-truncate',
                          activeId === subSection.slug
                            ? 'bd-text-foreground'
                            : 'bd-text-muted-foreground/70'
                        )}
                      >
                        {subSection.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
