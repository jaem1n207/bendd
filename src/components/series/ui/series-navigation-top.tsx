import { BookOpen } from 'lucide-react';
import Link from 'next/link';

import { seriesRoute } from '@/lib/series';

import type { SeriesNavigationProps } from '@/components/series/types/series';
import { SeriesArticleList } from '@/components/series/ui/series-article-list';

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
        href={seriesRoute(id)}
        className="mb-4 flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
      >
        <BookOpen className="size-4 shrink-0" />
        {name} 시리즈
      </Link>
      <SeriesArticleList articles={articles} currentOrder={currentOrder} />
    </nav>
  );
}
