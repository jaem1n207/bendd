import type { Metadata, ResolvingMetadata } from 'next';

import { SeriesBanner } from '@/components/series';
import { ArticleItem } from '@/components/article/ui/article-item';
import { JsonLdScript } from '@/components/structured-data';
import { siteMetadata } from '@/lib/site-metadata';
import { createCraftIndexGraph } from '@/lib/structured-data';
import {
  formatCraftsForDisplay,
  getSeriesSummaries,
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
  const seriesSummaries = getSeriesSummaries(articles);
  const formattedArticleInfo = formatCraftsForDisplay(articles, {
    includeRelativeDate: false,
  });

  const collectionJsonLd = createCraftIndexGraph({ articles });

  return (
    <main>
      <JsonLdScript data={collectionJsonLd} />
      <div className="relative mx-auto my-0 mt-8 max-w-4xl space-y-1 overflow-y-auto overflow-x-hidden px-2 pb-28 pt-10 sm:px-6 sm:py-32">
        <SeriesBanner items={seriesSummaries} />
        {formattedArticleInfo.map((article, index) => (
          <ArticleItem key={article.href} {...article} index={index} />
        ))}
      </div>
    </main>
  );
}
