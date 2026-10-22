import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FluidHover } from '@/components/ui/fluid-hover';
import { JsonLdScript } from '@/components/structured-data';
import { Typography } from '@/components/ui/typography';
import {
  getSeriesMetadata,
  listSeriesRoutes,
  resolveSeries,
  SeriesStatus,
} from '@/lib/series';
import { siteMetadata } from '@/lib/site-metadata';
import { createSeriesGraph } from '@/lib/structured-data';
import { cn } from '@/lib/utils';
import { formatDate, readArticles } from '@/mdx/mdx';

const getArticles = cache(() => readArticles());

export function generateStaticParams() {
  return listSeriesRoutes('article').map(({ id }) => ({ id }));
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const result = getSeriesMetadata(
    { id: params.id, contentType: 'article' },
    siteMetadata.siteUrl
  );
  if (result.status !== SeriesStatus.Ready) {
    notFound();
  }
  return result.metadata;
}

export default async function SeriesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  // Reject unknown kinds before reading or validating unrelated MDX files.
  const query = { id: params.id, contentType: 'article' as const };
  if (
    getSeriesMetadata(query, siteMetadata.siteUrl).status !== SeriesStatus.Ready
  ) {
    notFound();
  }
  const result = resolveSeries(getArticles(), query);
  if (result.status !== SeriesStatus.Ready) {
    notFound();
  }
  const seriesInfo = result.info;

  const collectionJsonLd = createSeriesGraph({ seriesInfo });

  return (
    <main className="relative mx-auto my-0 min-h-screen max-w-2xl overflow-hidden px-6 py-32">
      <JsonLdScript data={collectionJsonLd} />
      <Typography variant="h2">{seriesInfo.name} 시리즈</Typography>
      <Typography variant="p" className="!mt-2 text-muted-foreground">
        {seriesInfo.description}
      </Typography>
      <Typography
        variant="p"
        className="!mt-1 text-sm text-muted-foreground/60"
      >
        {seriesInfo.articles.length}개의 글
      </Typography>

      <FluidHover>
        <ol className="mt-10 space-y-3">
          {seriesInfo.articles.map(article => (
            <li key={article.slug}>
              <Link
                data-fluid-hover-item=""
                href={article.href}
                className={cn(
                  'block rounded-xl border border-border/60 px-5 py-4',
                  'transition-colors data-[fluid-hover-active]:border-primary/40'
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
                        date: article.publishedAt,
                        includeRelative: true,
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </FluidHover>
    </main>
  );
}
