import { MetadataRoute } from 'next';

import { siteMetadata } from '@/lib/site-metadata';

const pathnames = ['/', '/article'];

export default function sitemap(): MetadataRoute.Sitemap {
  return pathnames.map(pathname => ({
    url: `${siteMetadata.siteUrl}${pathname}`,
    lastModified: new Date(),
  }));
}
