import { CornerUpLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { BlogPosting, WithContext } from 'schema-dts';

import { Giscus } from '@/components/comments/giscus';
import { Typography } from '@/components/ui/typography';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';
import { SkeletonTableOfContents } from '@/mdx/common/table-of-contents/skeleton-table-of-contents';
import { CustomMDX } from '@/mdx/custom-mdx';
import { type Article, formatDate } from '@/mdx/mdx';

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
}

export function MdxLayout({ post, type }: MdxLayoutProps) {
  const { title, publishedAt, summary, description, image } = post.metadata;

  const jsonLd: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: new Date(publishedAt).toISOString(),
    dateModified: new Date(publishedAt).toISOString(),
    description: summary,
    image: image
      ? `${siteMetadata.siteUrl}${image}`
      : `/api/og?title=${encodeURIComponent(title)}`,
    url: `${siteMetadata.siteUrl}/${type}/${post.slug}`,
    author: {
      '@type': 'Person',
      name: siteMetadata.author,
      url: siteMetadata.github,
    },
  };

  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-32 bd-font-tmoney">
      <section id="BenddDoc">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
        <div className="bd-fixed bd-bottom-0 bd-left-5 bd-top-24 bd-hidden bd-overflow-hidden lg:bd-block">
          <Link
            href={`/${type}`}
            className={cn(
              'bd-flex bd-itesm-center bd-gap-x-1 bd-w-fit bd-leading-5 bd-text-sm',
              'bd-p-1 -bd-m-1',
              'bd-text-muted-foreground bd-transition-colors hover:bd-text-primary'
            )}
          >
            <CornerUpLeft className="bd-size-4" />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Link>
          <TableOfContents />
        </div>
        <Typography variant="h2">{title}</Typography>
        <Typography
          variant="p"
          className="!bd-mt-2 bd-text-muted-foreground/80"
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
          className="bd-mt-6 bd-break-keep"
          asChild
        >
          <blockquote>
            <p>
              <strong>TL;DR</strong>: {description}
            </p>
          </blockquote>
        </Typography>
        <article
          className={cn(
            'bd-prose bd-prose-slate bd-mb-24 dark:bd-prose-invert md:bd-mb-40',
            type === 'article' ? 'bd-mt-16 md:bd-mt-24' : 'bd-mt-40 md:bd-mt-52'
          )}
        >
          <CustomMDX source={post.content} />
        </article>
        <Giscus />
      </section>
    </main>
  );
}
