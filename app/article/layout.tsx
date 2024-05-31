import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { siteMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: '피드',
  description: '작성한 글들을 모아놓은 공간입니다.',
  openGraph: {
    type: 'website',
    url: `${siteMetadata.siteUrl}/articles`,
    siteName: 'Bendd의 피드',
  },
};

export default function ArticleLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-32">
      {children}
    </main>
  );
}
