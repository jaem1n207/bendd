import { ArrowRight, BookOpen } from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { type SeriesConfig } from '@/lib/series';

type SeriesBannerItem = {
  id: string;
  config: SeriesConfig;
  articleCount: number;
};

type SeriesBannerProps = {
  items: SeriesBannerItem[];
};

export function SeriesBanner({ items }: SeriesBannerProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {items.map(({ id, config, articleCount }) => (
        <Link
          key={id}
          href={`/article/series/${id}` as Route<''>}
          className={cn(
            'group flex items-center justify-between rounded-xl border border-border/60 px-5 py-4',
            'transition-colors hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="size-5 shrink-0 text-primary/70" />
            <div>
              <span className="font-medium">{config.name} 시리즈</span>
              <p className="text-sm text-muted-foreground">
                {config.description} · {articleCount}편
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ))}
    </div>
  );
}
