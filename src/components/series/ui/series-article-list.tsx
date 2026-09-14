import Link from 'next/link';

import { FluidHover } from '@/components/ui/fluid-hover';
import { cn } from '@/lib/utils';
import type { SeriesArticleEntry } from '@/mdx/mdx';

type SeriesArticleListProps = {
  articles: SeriesArticleEntry[];
  currentOrder: number;
};

export function SeriesArticleList({
  articles,
  currentOrder,
}: SeriesArticleListProps) {
  return (
    <FluidHover highlightClassName="rounded-md bg-muted">
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
                  data-fluid-hover-item=""
                  href={article.href}
                  className={cn(
                    'flex items-baseline gap-2 rounded-md px-2.5 py-1.5 text-sm',
                    'text-muted-foreground transition-colors data-[fluid-hover-active]:text-foreground'
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
    </FluidHover>
  );
}
