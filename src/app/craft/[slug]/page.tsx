import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Giscus } from '@/components/comments/giscus';
import {
  CustomMDX,
  TableOfContents,
  createCraftMDXProcessor,
  formatDate,
  parseToc,
} from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateStaticParams() {
  const processor = createCraftMDXProcessor();

  return processor.map(article => article.slug);
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const processor = createCraftMDXProcessor();
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
      canonical: `${siteMetadata.siteUrl}/craft/${post.slug}`,
      languages: {
        ko: `${siteMetadata.siteUrl}/craft/${post.slug}`,
        ['x-default']: `${siteMetadata.siteUrl}/craft/${post.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      publishedTime,
      url: `${siteMetadata.siteUrl}/craft/${post.slug}`,
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

export default function Craft({ params }: { params: { slug: string } }) {
  const processor = createCraftMDXProcessor();
  const post = processor.getArticleBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const toc = parseToc(post.content);

  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-32 bd-font-tmoney">
      <section>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.metadata.title,
              datePublished: new Date(post.metadata.publishedAt).toISOString(),
              dateModified: new Date(post.metadata.publishedAt).toISOString(),
              description: post.metadata.summary,
              image: post.metadata.image
                ? `${siteMetadata.siteUrl}${post.metadata.image}`
                : `/api/og?title=${encodeURIComponent(post.metadata.title)}`,
              url: `${siteMetadata.siteUrl}/craft/${post.slug}`,
              author: {
                '@type': 'Person',
                name: siteMetadata.author,
                url: siteMetadata.github,
              },
            }),
          }}
        />
        <nav className="bd-fixed bd-bottom-0 bd-left-5 bd-top-24 bd-hidden bd-overflow-hidden lg:bd-block">
          <div className="bd-relative bd-border-l bd-border-solid bd-border-border bd-pl-4">
            <TableOfContents toc={toc} />
          </div>
        </nav>
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
