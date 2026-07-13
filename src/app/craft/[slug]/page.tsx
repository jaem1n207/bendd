import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';

import { MdxLayout } from '@/components/layout/mdx';
import { siteMetadata } from '@/lib/site-metadata';
import { findBySlug, getSeriesInfo, readCraftArticles } from '@/mdx/mdx';

const getCraftArticles = cache(() => readCraftArticles());

export async function generateStaticParams() {
  const articles = getCraftArticles();

  return articles.map(article => ({ slug: article.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const articles = getCraftArticles();
  const post = findBySlug(articles, params.slug);

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

export default async function CraftPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const articles = getCraftArticles();
  const post = findBySlug(articles, params.slug);

  if (!post) {
    notFound();
  }

  const seriesInfo =
    post.metadata.series && post.metadata.seriesOrder
      ? getSeriesInfo(
          articles,
          post.metadata.series,
          post.metadata.seriesOrder,
          {
            contentType: 'craft',
          }
        )
      : undefined;

  return <MdxLayout post={post} type="craft" seriesInfo={seriesInfo} />;
}
