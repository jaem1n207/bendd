import { MetadataRoute } from 'next';

import { siteMetadata } from '@/lib/site-metadata';
import { getArticles } from './article/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'article'].map(route => ({
    url: `${siteMetadata.siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  const articles = getArticles().map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  return [...routes, ...articles];
}
