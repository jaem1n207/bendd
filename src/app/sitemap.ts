import { MetadataRoute } from 'next';

import { createCraftMDXProcessor, createMDXProcessor } from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'craft', 'article'].map(route => ({
    url: `${siteMetadata.siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }));

  const processor = createMDXProcessor();
  const articles = processor.map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  const mdxProcessor = createCraftMDXProcessor();
  const crafts = mdxProcessor.map(article => ({
    url: `${siteMetadata.siteUrl}/craft/${article.slug}`,
    lastModified: article.metadata.publishedAt,
  }));

  return [...routes, ...crafts, ...articles];
}
