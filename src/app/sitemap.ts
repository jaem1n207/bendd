import { MetadataRoute } from 'next';

import { createMDXProcessor } from '@/components/article';
import { siteMetadata } from '@/lib/site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'article'].map(route => ({
    url: `${siteMetadata.siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  const processor = createMDXProcessor();
  const articles = processor.map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  return [...routes, ...articles];
}
