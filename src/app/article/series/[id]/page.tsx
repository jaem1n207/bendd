import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Typography } from '@/components/ui/typography';
import { getAllSeriesIds, getSeriesConfig } from '@/lib/series';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';
import { createMDXProcessor, formatDate } from '@/mdx/mdx';

export function generateStaticParams() {
  return getAllSeriesIds().map(id => ({ id }));
}

export function generateMetadata({
  params,
}: {
  params: { id: string };
}): Metadata {
  const config = getSeriesConfig(params.id);
  if (!config) notFound();

  return {
    title: `${config.name} 시리즈`,
    description: config.description,
    alternates: {
      canonical: `${siteMetadata.siteUrl}/article/series/${params.id}`,
    },
    openGraph: {
      type: 'website',
      url: `${siteMetadata.siteUrl}/article/series/${params.id}`,
      title: `${config.name} 시리즈`,
      description: config.description,
    },
  };
}

export default function SeriesPage({
  params,
}: {
  params: { id: string };
}) {
  const config = getSeriesConfig(params.id);
  if (!config) notFound();

  const processor = createMDXProcessor();
  const seriesInfo = processor.getSeriesInfo(params.id, -1);
  if (!seriesInfo) notFound();

  return (
    <main className="relative mx-auto my-0 min-h-screen max-w-2xl overflow-hidden px-6 py-32">
      <Typography variant="h2">{config.name} 시리즈</Typography>
      <Typography variant="p" className="!mt-2 text-muted-foreground">
        {config.description}
      </Typography>
      <Typography variant="p" className="!mt-1 text-sm text-muted-foreground/60">
        {seriesInfo.articles.length}개의 글
      </Typography>

      <ol className="mt-10 space-y-3">
        {seriesInfo.articles.map(article => (
          <li key={article.slug}>
            <Link
              href={article.href}
              className={cn(
                'block rounded-xl border border-border/60 px-5 py-4',
                'transition-colors hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground/60">
                  {article.order}.
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium">{article.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate({
                      date:
                        processor.getArticleBySlug(article.slug)?.metadata
                          .publishedAt ?? '',
                      includeRelative: true,
                    })}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
