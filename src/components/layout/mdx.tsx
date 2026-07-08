import { CornerUpLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { Giscus } from '@/components/comments/giscus';
import styles from '@/components/layout/mdx-layout.module.css';
import {
  SeriesNavigationBottom,
  SeriesNavigationTop,
} from '@/components/series';
import { JsonLdScript } from '@/components/structured-data';
import { Typography } from '@/components/ui/typography';
import {
  createArticleDetailGraph,
  createCraftDetailGraph,
} from '@/lib/structured-data';
import { cn } from '@/lib/utils';
import { SkeletonTableOfContents } from '@/mdx/common/table-of-contents/skeleton-table-of-contents';
import { CustomMDX } from '@/mdx/custom-mdx';
import { type Article, type SeriesInfo, formatDate } from '@/mdx/mdx';

const TableOfContents = dynamic(
  () =>
    import('@/mdx/common/table-of-contents/table-of-contents').then(
      mod => mod.TableOfContents
    ),
  {
    ssr: false,
    loading: SkeletonTableOfContents,
  }
);

interface MdxLayoutProps {
  post: Article;
  type: 'article' | 'craft';
  seriesInfo?: SeriesInfo;
}

export function MdxLayout({ post, type, seriesInfo }: MdxLayoutProps) {
  const { title, publishedAt, summary, description } = post.metadata;

  const detailJsonLd =
    type === 'article'
      ? createArticleDetailGraph({ post })
      : createCraftDetailGraph({ post });

  return (
    <main className="relative mx-auto my-0 min-h-screen max-w-2xl overflow-hidden px-6 py-32">
      <section
        id="BenddDoc"
        data-webmcp-content
        data-webmcp-content-type={type}
        data-webmcp-slug={post.slug}
        data-webmcp-title={title}
        data-webmcp-published-at={publishedAt}
        data-webmcp-description={description}
        data-webmcp-summary={summary}
        data-webmcp-series-id={seriesInfo?.id}
        data-webmcp-series-name={seriesInfo?.name}
      >
        <JsonLdScript data={detailJsonLd} />
        <div className="fixed bottom-16 left-5 top-24 hidden w-[34rem] max-w-[calc((100vw-42rem)/2-2rem)] flex-col overflow-hidden pr-4 lg:flex">
          <Link
            href={`/${type}`}
            className={cn(
              'flex items-center gap-x-1 w-fit leading-5 text-sm',
              'p-1 -m-1',
              'text-muted-foreground transition-colors hover:text-primary'
            )}
          >
            <CornerUpLeft className="size-4" />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Link>
          <TableOfContents />
        </div>
        <Typography
          variant="h2"
          className={cn(styles.contentText, styles.contentTitle)}
        >
          {title}
        </Typography>
        <Typography
          variant="p"
          className="!mt-2 text-muted-foreground/80"
          asChild
        >
          <p>
            {formatDate({
              date: publishedAt,
              includeRelative: true,
            })}
          </p>
        </Typography>
        <Typography
          variant="blockquote"
          className={cn(
            'mt-6 break-keep',
            styles.contentText,
            styles.contentSummary
          )}
          asChild
        >
          <blockquote>
            <p>
              <strong>TL;DR</strong>: {description}
            </p>
          </blockquote>
        </Typography>
        {seriesInfo && <SeriesNavigationTop {...seriesInfo} />}
        <article
          data-content-font="system"
          className={cn(
            'prose prose-slate mb-24 dark:prose-invert md:mb-40',
            styles.contentArticle,
            type === 'article' ? 'mt-16 md:mt-24' : 'mt-40 md:mt-52'
          )}
        >
          <CustomMDX source={post.content} />
        </article>
        {seriesInfo && <SeriesNavigationBottom {...seriesInfo} />}
        <Giscus />
      </section>
    </main>
  );
}
