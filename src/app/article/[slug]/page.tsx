import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MdxLayout } from '@/components/layout/mdx';
import { siteMetadata } from '@/lib/site-metadata';
import { createMDXProcessor } from '@/mdx/mdx';

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

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const processor = createMDXProcessor();
  const post = processor.getArticleBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return <MdxLayout post={post} type="article" />;
}
