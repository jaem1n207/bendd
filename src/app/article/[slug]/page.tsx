import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createMDXProcessor, formatDate } from '@/components/article';
import { Giscus } from '@/components/comments/giscus';
import { CustomMDX } from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateStaticParams() {
  const processor = createMDXProcessor();

  return processor.getSlugs();
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const processor = createMDXProcessor();
  const articles = processor.getOriginalArticles();
  const post = articles.find(post => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  const {
    title: postTitle,
    publishedAt: publishedTime,
    summary: description,
    image: postImage,
  } = post.metadata;
  const title = `${postTitle} • ${siteMetadata.title} article`;
  const ogImage = postImage
    ? postImage
    : `/api/og?title=${encodeURIComponent(postTitle)}`;

  return {
    title,
    description,
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
  };
}

export default function Blog({ params }: { params: { slug: string } }) {
  const processor = createMDXProcessor();
  const articles = processor.getOriginalArticles();
  const post = articles.find(post => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-32">
      <section>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.metadata.title,
              datePublished: post.metadata.publishedAt,
              dateModified: post.metadata.publishedAt,
              description: post.metadata.summary,
              image: post.metadata.image
                ? `${siteMetadata.siteUrl}${post.metadata.image}`
                : `/api/og?title=${encodeURIComponent(post.metadata.title)}`,
              url: `${siteMetadata.siteUrl}/article/${post.slug}`,
              author: {
                '@type': 'Person',
                name: siteMetadata.author,
              },
            }),
          }}
        />
        <h1 className="bd-mx-auto bd-mt-12 bd-break-keep bd-text-center bd-text-4xl bd-font-bold bd-tracking-tight md:bd-mt-24">
          {post.metadata.title}
        </h1>
        <p className="bd-mx-auto bd-mt-6 bd-w-full bd-max-w-lg bd-break-keep bd-text-center bd-text-lg">
          {post.metadata.summary}
        </p>
        <p className="bd-mt-6 bd-text-center bd-text-sm bd-tabular-nums bd-text-primary/60">
          {formatDate(post.metadata.publishedAt, true)}
        </p>
        <article className="bd-prose bd-prose-slate bd-mb-24 bd-mt-40 dark:bd-prose-invert md:bd-mb-40 md:bd-mt-52">
          <CustomMDX source={post.content} />
        </article>
        <Giscus />
      </section>
    </main>
  );
}
