import type { Metadata, ResolvingMetadata } from 'next';

import { ArticleItem } from '@/components/article/ui/article-item';
import { JsonLdScript } from '@/components/structured-data';
import { siteMetadata } from '@/lib/site-metadata';
import { createCraftIndexGraph } from '@/lib/structured-data';
import {
  formatCraftsForDisplay,
  readCraftArticles,
  sortByDateDesc,
} from '@/mdx/mdx';

export async function generateMetadata(
  {},
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: '작업 목록',
    description: '작업한 결과물을 모아놓은 공간입니다.',
    alternates: {
      canonical: `${siteMetadata.siteUrl}/craft`,
      languages: {
        ko: `${siteMetadata.siteUrl}/craft`,
        ['x-default']: `${siteMetadata.siteUrl}/craft`,
      },
    },
    openGraph: {
      type: 'website',
      url: `${siteMetadata.siteUrl}/craft`,
      siteName: `${siteMetadata.author}의 작업 목록`,
      images: [...previousImages],
    },
  };
}

export default function CraftPage() {
  const articles = sortByDateDesc(readCraftArticles());
  const formattedArticleInfo = formatCraftsForDisplay(articles, {
    includeRelativeDate: false,
  });

  const collectionJsonLd = createCraftIndexGraph({ articles });

  return (
    <main className="relative mx-auto my-0 min-h-screen max-w-4xl overflow-y-auto px-6 pt-10 sm:py-32">
      <JsonLdScript data={collectionJsonLd} />
      <div className="mt-8 flex flex-col gap-7">
        {formattedArticleInfo.map((article, index) => (
          <ArticleItem key={article.href} {...article} index={index} />
        ))}
      </div>
    </main>
  );
}
