import type { Metadata, ResolvingMetadata } from 'next';

import { ArticleList } from '@/components/article';
import { siteMetadata } from '@/lib/site-metadata';

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
  return (
    <main>
      <ArticleList />
    </main>
  );
}
