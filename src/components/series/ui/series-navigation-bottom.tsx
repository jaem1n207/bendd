import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

import { seriesRoute } from '@/lib/series';

import type { SeriesNavigationProps } from '@/components/series/types/series';
import { SeriesArticleList } from '@/components/series/ui/series-article-list';

export function SeriesNavigationBottom({
  id,
  name,
  articles,
  currentOrder,
}: SeriesNavigationProps) {
  const currentIndex = articles.findIndex(a => a.order === currentOrder);
  const prev = currentIndex > 0 ? articles[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < articles.length - 1
      ? articles[currentIndex + 1]
      : undefined;

  return (
    <nav
      aria-label="시리즈 하단 네비게이션"
      className="mb-16 mt-12 rounded-lg border border-border/60 bg-muted/30 p-5"
    >
      <Link
        href={seriesRoute(id)}
        className="mb-4 flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
      >
        <BookOpen className="size-4 shrink-0" />
        {name} 시리즈
      </Link>

      <SeriesArticleList articles={articles} currentOrder={currentOrder} />

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
