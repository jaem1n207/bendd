import { BookOpen } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { SeriesNavigationProps } from '../types/series';

export function SeriesNavigationTop({
  id,
  name,
  articles,
  currentOrder,
}: SeriesNavigationProps) {
  return (
    <div
      className={cn(
        'mt-6 rounded-lg border border-border/60 bg-muted/30 px-4 py-3'
      )}
    >
      <Link
        href={`/article/series/${id}` as Route<''>}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <BookOpen className="size-4 shrink-0" />
        <span className="font-medium text-foreground">{name}</span>
        <span className="tabular-nums">
          ({currentOrder}/{articles.length})
        </span>
      </Link>
    </div>
  );
}
