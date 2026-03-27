import { BookOpen } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { SeriesNavigationProps } from '@/components/series/types/series';

export function SeriesNavigationTop({
  id,
  name,
  articles,
  currentOrder,
}: SeriesNavigationProps) {
  return (
    <nav
      aria-label="시리즈 상단 네비게이션"
      className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-5"
    >
      <Link
        href={`/article/series/${id}` as Route<''>}
        className="mb-4 flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
      >
        <BookOpen className="size-4 shrink-0" />
        {name} 시리즈
      </Link>

      <ol className="space-y-1.5">
        {articles.map(article => {
          const isCurrent = article.order === currentOrder;
          return (
            <li key={article.slug}>
              {isCurrent ? (
                <span
                  className={cn(
                    'flex items-baseline gap-2 rounded-md px-2.5 py-1.5 text-sm',
                    'bg-primary/10 font-medium text-primary'
                  )}
                >
                  <span className="shrink-0 tabular-nums text-primary/60">
                    {article.order}.
                  </span>
                  {article.title}
                </span>
              ) : (
                <Link
                  href={article.href}
                  className={cn(
                    'flex items-baseline gap-2 rounded-md px-2.5 py-1.5 text-sm',
                    'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="shrink-0 tabular-nums text-muted-foreground/60">
                    {article.order}.
                  </span>
                  {article.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
