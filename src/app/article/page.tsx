import type { Metadata } from 'next';

import { ArticleList } from '@/components/article';
import { siteMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: '피드',
  description: '작성한 글들을 모아놓은 공간입니다.',
  openGraph: {
    type: 'website',
    url: `${siteMetadata.siteUrl}/article`,
    siteName: 'Bendd의 피드',
  },
};

export default function ArticlePage() {
  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-4xl bd-overflow-y-auto bd-px-6 bd-pt-10 sm:bd-py-32">
      <ArticleList className="bd-mt-8" />
    </main>
  );
}
