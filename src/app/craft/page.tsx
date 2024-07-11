import type { Metadata, ResolvingMetadata } from 'next';

import { ArticleItem } from '@/components/article/ui/article-item';
import { createCraftMDXProcessor } from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateMetadata(
  {},
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: '작업 목록',
    description: '작업한 결과물을 모아놓은 공간입니다.',
    openGraph: {
      type: 'website',
      url: `${siteMetadata.siteUrl}/craft`,
      siteName: 'Bendd의 작업 목록',
      images: [...previousImages],
    },
  };
}

export default function CraftPage() {
  const processor = createCraftMDXProcessor();
  const formattedArticleInfo = processor
    .sortByDateDesc()
    .formatForCraftDisplay({
      includeRelativeDate: false,
    });

  return (
    <main className="bd-relative bd-mx-auto bd-my-0 bd-min-h-screen bd-max-w-4xl bd-overflow-y-auto bd-px-6 bd-pt-10 sm:bd-py-32">
      {formattedArticleInfo.map((article, index) => (
        <ArticleItem key={article.href} {...article} index={index} />
      ))}
    </main>
  );
}
