import type { Metadata, ResolvingMetadata } from 'next';
import type { CollectionPage, WithContext } from 'schema-dts';

import { ArticleList } from '@/components/article';
import { siteMetadata } from '@/lib/site-metadata';
import { readArticles, sortByDateDesc } from '@/mdx/mdx';

export async function generateMetadata(
  {},
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: '기술 이야기',
    description: '경험과 지식을 공유하는 공간입니다.',
    alternates: {
      canonical: `${siteMetadata.siteUrl}/article`,
      languages: {
        ko: `${siteMetadata.siteUrl}/article`,
        ['x-default']: `${siteMetadata.siteUrl}/article`,
      },
    },
    openGraph: {
      type: 'website',
      url: `${siteMetadata.siteUrl}/article`,
      siteName: `${siteMetadata.author}의 경험과 지식 공유 공간`,
      images: [...previousImages],
    },
  };
}

export default function ArticlePage() {
  const articles = sortByDateDesc(readArticles());

  const collectionJsonLd: WithContext<CollectionPage> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '기술 이야기',
    description: '경험과 지식을 공유하는 공간입니다.',
    url: `${siteMetadata.siteUrl}/article`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem' as const,
        position: index + 1,
        url: `${siteMetadata.siteUrl}/article/${article.slug}`,
        name: article.metadata.title,
      })),
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd),
        }}
      />
      <ArticleList />
    </main>
  );
}
