import { MetadataRoute } from 'next';

export const host = 'https://bendd.me';
const pathnames = ['/', '/projects', '/articles'];

export default function sitemap(): MetadataRoute.Sitemap {
  return pathnames.map(pathname => ({
    url: `${host}${pathname}`,
    lastModified: new Date(),
  }));
}
