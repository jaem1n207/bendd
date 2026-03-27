import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';

import { MdxLayout } from '@/components/layout/mdx';
import { siteMetadata } from '@/lib/site-metadata';
import { createMDXProcessor } from '@/mdx/mdx';

const getProcessor = cache(() => createMDXProcessor());

export async function generateStaticParams() {
  const processor = getProcessor();

  return processor.map(article => article.slug);
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const processor = getProcessor();
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
          width: 1200,
          height: 630,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
        },
      ],
    },
  } satisfies Metadata;
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const processor = getProcessor();
  const post = processor.getArticleBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const seriesInfo =
    post.metadata.series && post.metadata.seriesOrder
      ? processor.getSeriesInfo(post.metadata.series, post.metadata.seriesOrder)
      : undefined;

  return <MdxLayout post={post} type="article" seriesInfo={seriesInfo} />;
}
