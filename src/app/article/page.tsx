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
      siteName: 'Bendd의 피드',
      images: [...previousImages],
    },
  };
}

export default function ArticlePage() {
  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-4xl bd-overflow-y-auto bd-px-6 bd-pt-10 sm:bd-py-32">
      <ArticleList className="bd-mt-8" />
    </main>
  );
}
