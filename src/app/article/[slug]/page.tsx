import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { formatDate, getArticles } from '@/app/article/utils';
import { Giscus } from '@/components/comments/giscus';
import { CustomMDX } from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateStaticParams() {
  const articles = getArticles();

  return articles.map(post => ({
    slug: post.slug,
  }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getArticles().find(post => post.slug === params.slug);

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
  const post = getArticles().find(post => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
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
        {formatDate(post.metadata.publishedAt)}
      </p>
      <article className="bd-prose bd-prose-slate bd-mb-24 bd-mt-40 dark:bd-prose-invert md:bd-mb-40 md:bd-mt-52">
        <CustomMDX source={post.content} />
      </article>
      <Giscus />
    </section>
  );
}
