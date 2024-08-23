import { CornerUpLeft } from 'lucide-react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { BlogPosting, WithContext } from 'schema-dts';

import { Giscus } from '@/components/comments/giscus';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';
import { SkeletonTableOfContents } from '@/mdx/common/table-of-contents/skeleton-table-of-contents';
import { CustomMDX } from '@/mdx/custom-mdx';
import { createMDXProcessor, formatDate } from '@/mdx/mdx';

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

export async function generateStaticParams() {
  const processor = createMDXProcessor();

  return processor.map(article => article.slug);
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const processor = createMDXProcessor();
  const post = processor.getArticleBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const {
    title: postTitle,
    publishedAt: publishedTime,
    summary: description,
    image: postImage,
  } = post.metadata;
  const title = `${postTitle}`;
  const ogImage = postImage
    ? postImage
    : `/api/og?title=${encodeURIComponent(postTitle)}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteMetadata.siteUrl}/article/${post.slug}`,
      languages: {
        ko: `${siteMetadata.siteUrl}/article/${post.slug}`,
        ['x-default']: `${siteMetadata.siteUrl}/article/${post.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      publishedTime,
      url: `${siteMetadata.siteUrl}/article/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  } satisfies Metadata;
}

export default function Blog({ params }: { params: { slug: string } }) {
  const processor = createMDXProcessor();
  const post = processor.getArticleBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const jsonLd: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metadata.title,
    datePublished: new Date(post.metadata.publishedAt).toISOString(),
    dateModified: new Date(post.metadata.publishedAt).toISOString(),
    description: post.metadata.summary,
    image: post.metadata.image
      ? `${siteMetadata.siteUrl}${post.metadata.image}`
      : `/api/og?title=${encodeURIComponent(post.metadata.title)}`,
    url: `${siteMetadata.siteUrl}/article/${post.slug}`,
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
            href="/article"
            className={cn(
              'bd-flex bd-itesm-center bd-gap-x-1 bd-w-fit bd-leading-5 bd-text-sm',
              'bd-p-1 -bd-m-1',
              'bd-text-muted-foreground bd-transition-colors hover:bd-text-primary'
            )}
          >
            <CornerUpLeft className="bd-size-4" />
            Article
          </Link>
          <TableOfContents />
        </div>
        <h1 className="bd-mx-auto bd-mt-12 bd-break-keep bd-text-center bd-text-4xl bd-font-bold bd-tracking-tight md:bd-mt-24">
          {post.metadata.title}
        </h1>
        <p className="bd-mx-auto bd-mt-6 bd-w-full bd-max-w-lg bd-break-keep bd-text-center bd-text-lg">
          {post.metadata.description}
        </p>
        <p className="bd-mt-6 bd-text-center bd-text-sm bd-tabular-nums bd-text-primary/60">
          {formatDate({
            date: post.metadata.publishedAt,
            includeRelative: true,
          })}
        </p>
        <article className="bd-prose bd-prose-slate bd-mb-24 bd-mt-40 dark:bd-prose-invert md:bd-mb-40 md:bd-mt-52">
          <CustomMDX source={post.content} />
        </article>
        <Giscus />
      </section>
    </main>
  );
}
