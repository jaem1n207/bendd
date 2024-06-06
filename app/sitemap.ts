import { MetadataRoute } from 'next';

import { siteMetadata } from '@/lib/site-metadata';
import { getArticles } from './article/utils';

const priorityValue = {
  index: 1.0,
  segment: 0.8,
  dynamicSegment: 0.64,
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'article'].map(pathname => ({
    url: `${siteMetadata.siteUrl}/${pathname}`,
    lastModified: new Date(),
    priority: pathname === '' ? priorityValue.index : priorityValue.segment,
  }));

  const articles = getArticles();
  const articleRoutes = articles.map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: new Date(article.metadata.publishedAt),
    priority: priorityValue.dynamicSegment,
  }));

  return [...routes, ...articleRoutes];
}
