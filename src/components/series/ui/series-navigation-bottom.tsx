import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { SeriesNavigationProps } from '@/components/series/types/series';

export function SeriesNavigationBottom({
  id,
  name,
  articles,
  currentOrder,
}: SeriesNavigationProps) {
  const prev = articles.find(a => a.order === currentOrder - 1);
  const next = articles.find(a => a.order === currentOrder + 1);

  return (
    <nav
      aria-label="시리즈 네비게이션"
      className="mb-16 mt-12 rounded-lg border border-border/60 bg-muted/30 p-5"
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

      {(prev || next) && (
        <div className="mt-4 flex items-stretch gap-3 border-t border-border/60 pt-4">
          {prev ? (
            <Link
              href={prev.href}
              className="group flex flex-1 flex-col gap-1 rounded-md p-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="size-3" />
                이전
              </span>
              <span className="line-clamp-1 text-foreground transition-colors group-hover:text-primary">
                {prev.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={next.href}
              className="group flex flex-1 flex-col items-end gap-1 rounded-md p-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                다음
                <ArrowRight className="size-3" />
              </span>
              <span className="line-clamp-1 text-foreground transition-colors group-hover:text-primary">
                {next.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </nav>
  );
}
