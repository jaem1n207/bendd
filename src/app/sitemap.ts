import { MetadataRoute } from 'next';

import { getAllSeriesIds } from '@/lib/series';
import { siteMetadata } from '@/lib/site-metadata';
import { readArticles, readCraftArticles } from '@/mdx/mdx';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'craft', 'article'].map(route => ({
    url: `${siteMetadata.siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  const crafts = readCraftArticles().map(article => ({
    url: `${siteMetadata.siteUrl}/craft/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  const articles = readArticles().map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  const series = getAllSeriesIds().map(id => ({
    url: `${siteMetadata.siteUrl}/article/series/${id}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  return [...routes, ...crafts, ...articles, ...series];
}
