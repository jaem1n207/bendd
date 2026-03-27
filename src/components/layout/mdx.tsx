import { CornerUpLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { BreadcrumbList, BlogPosting, WithContext } from 'schema-dts';

import { Giscus } from '@/components/comments/giscus';
import {
  SeriesNavigationBottom,
  SeriesNavigationTop,
} from '@/components/series';
import { Typography } from '@/components/ui/typography';
import { siteMetadata } from '@/lib/site-metadata';
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
  const { title, publishedAt, summary, description, image } = post.metadata;

  const typeName = type === 'article' ? '기술 이야기' : '작업 목록';

  const jsonLd: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: new Date(publishedAt).toISOString(),
    dateModified: new Date(publishedAt).toISOString(),
    description: summary,
    image: image
      ? `${siteMetadata.siteUrl}${image}`
      : `${siteMetadata.siteUrl}/api/og?title=${encodeURIComponent(title)}`,
    url: `${siteMetadata.siteUrl}/${type}/${post.slug}`,
    author: {
      '@type': 'Person',
      name: siteMetadata.author,
      url: siteMetadata.github,
    },
  };

  const breadcrumbJsonLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '홈',
        item: siteMetadata.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: typeName,
        item: `${siteMetadata.siteUrl}/${type}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: `${siteMetadata.siteUrl}/${type}/${post.slug}`,
      },
    ],
  };

  return (
    <main className="relative mx-auto my-0 min-h-screen max-w-2xl overflow-hidden px-6 py-32">
      <section id="BenddDoc">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
        <div className="fixed bottom-16 left-5 top-24 hidden flex-col overflow-hidden lg:flex">
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
        <Typography variant="h2">{title}</Typography>
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
          className="mt-6 break-keep"
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
          className={cn(
            'prose prose-slate mb-24 dark:prose-invert md:mb-40',
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
