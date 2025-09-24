import { CornerUpLeft } from 'lucide-react';
import Link from 'next/link';
import type { BlogPosting, WithContext } from 'schema-dts';

import { Giscus } from '@/components/comments/giscus';
import { ClientTableOfContents } from '@/components/layout/client-table-of-contents';
import { Typography } from '@/components/ui/typography';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';
import { CustomMDX } from '@/mdx/custom-mdx';
import { type Article, formatDate } from '@/mdx/mdx';

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
    <main className="bd:relative bd:mx-auto bd:my-0 bd:min-h-screen bd:max-w-2xl bd:overflow-hidden bd:px-6 bd:py-32">
      <section id="BenddDoc">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
        <div className="bd:fixed bd:bottom-0 bd:left-5 bd:top-24 bd:hidden bd:overflow-hidden bd:lg:block">
          <Link
            href={`/${type}`}
            className={cn(
              'bd:flex bd:items-center bd:gap-x-1 bd:w-fit bd:leading-5 bd:text-sm',
              'bd:p-1 bd:-m-1',
              'bd:text-muted-foreground bd:transition-colors bd:hover:text-primary'
            )}
          >
            <CornerUpLeft className="bd:size-4" />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Link>
          <ClientTableOfContents />
        </div>
        <Typography variant="h2" asChild>
          <h1>{title}</h1>
        </Typography>
        <Typography
          variant="p"
          className="bd:!mt-2 bd:text-muted-foreground/80"
        >
          {formatDate(publishedAt, {
            locale: 'ko',
            includeRelative: true,
          })}
        </Typography>
        <Typography variant="blockquote" className="bd:mt-6 bd:break-keep">
          <strong>TL;DR</strong>: {description}
        </Typography>
        <article
          className={cn(
            'bd:prose bd:prose-slate bd:mb-24 bd:dark:prose-invert bd:md:mb-40',
            type === 'article' ? 'bd:mt-16 bd:md:mt-24' : 'bd:mt-40 bd:md:mt-52'
          )}
        >
          <CustomMDX source={post.content} />
        </article>
        <Giscus />
      </section>
    </main>
  );
}
