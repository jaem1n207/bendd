import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MdxLayout } from '@/components/layout/mdx';
import { siteMetadata } from '@/lib/site-metadata';
import { createCraftMDXProcessor } from '@/mdx/mdx';

export async function generateStaticParams() {
  const processor = createCraftMDXProcessor();

  return processor.map(article => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const processor = createCraftMDXProcessor();
  const post = processor.getArticleBySlug(slug);

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
      canonical: `${siteMetadata.siteUrl}/craft/${slug}`,
      languages: {
        ko: `${siteMetadata.siteUrl}/craft/${slug}`,
        ['x-default']: `${siteMetadata.siteUrl}/craft/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      publishedTime,
      url: `${siteMetadata.siteUrl}/craft/${slug}`,
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

export default async function CraftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const processor = createCraftMDXProcessor();
  const post = processor.getArticleBySlug(slug);

  if (!post) {
    notFound();
  }

  return <MdxLayout post={post} type="craft" />;
}
