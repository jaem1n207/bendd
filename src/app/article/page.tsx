import type { Metadata, ResolvingMetadata } from 'next';

import { ArticleList } from '@/components/article';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateMetadata(
  {},
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: '피드',
    description: '작성한 글들을 모아놓은 공간입니다.',
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
      siteName: `${siteMetadata.author}의 피드`,
      images: [...previousImages],
    },
  };
}

export default function ArticlePage() {
  return (
    <main>
      <ArticleList />
    </main>
  );
}
