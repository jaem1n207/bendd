import {
  getSeriesBadges,
  readArticles,
  readCraftArticles,
  sortByDateDesc,
  type Article,
} from '@/mdx/mdx';

export type WebMCPContentIndexItem = {
  type: 'article' | 'craft';
  slug: string;
  title: string;
  summary: string;
  description: string;
  publishedAt: string;
  category: string;
  href: string;
  series?: { id: string; name: string; order: number };
};

const toBaseIndexItem = (
  article: Article,
  type: WebMCPContentIndexItem['type']
): Omit<WebMCPContentIndexItem, 'series'> => ({
  type,
  slug: article.slug,
  title: article.metadata.title,
  summary: article.metadata.summary,
  description: article.metadata.description,
  publishedAt: article.metadata.publishedAt,
  category: article.metadata.category,
  href: `/${type}/${article.slug}`,
});

export function createWebMCPContentIndex(): WebMCPContentIndexItem[] {
  const articles = sortByDateDesc(readArticles());
  const crafts = sortByDateDesc(readCraftArticles());
  const seriesBadges = getSeriesBadges(articles);

  return [
    ...articles.map(article => {
      const item: WebMCPContentIndexItem = toBaseIndexItem(article, 'article');
      const series = seriesBadges.get(article.slug);

      if (series) {
        item.series = {
          id: series.id,
          name: series.name,
          order: series.order,
        };
      }

      return item;
    }),
    ...crafts.map(craft => toBaseIndexItem(craft, 'craft')),
  ];
}
