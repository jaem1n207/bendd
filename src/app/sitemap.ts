import { MetadataRoute } from 'next';

import { siteMetadata } from '@/lib/site-metadata';
import { createCraftMDXProcessor, createMDXProcessor } from '@/mdx/mdx';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', 'craft', 'article'].map(route => ({
    url: `${siteMetadata.siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    alternates: {
      languages: {
        ['x-default']: `${siteMetadata.siteUrl}/${route}`,
        ko: `${siteMetadata.siteUrl}/${route}`,
      },
    },
  }));

  const mdxProcessor = createCraftMDXProcessor();
  const crafts = mdxProcessor.map(article => ({
    url: `${siteMetadata.siteUrl}/craft/${article.slug}`,
    lastModified: article.metadata.publishedAt,
    alternates: {
      languages: {
        ['x-default']: `${siteMetadata.siteUrl}/craft/${article.slug}`,
        ko: `${siteMetadata.siteUrl}/craft/${article.slug}`,
      },
    },
  }));

  const processor = createMDXProcessor();
  const articles = processor.map(article => ({
    url: `${siteMetadata.siteUrl}/article/${article.slug}`,
    lastModified: article.metadata.publishedAt,
    alternates: {
      languages: {
        ['x-default']: `${siteMetadata.siteUrl}/article/${article.slug}`,
        ko: `${siteMetadata.siteUrl}/article/${article.slug}`,
      },
    },
  }));

  return [...routes, ...crafts, ...articles];
}
