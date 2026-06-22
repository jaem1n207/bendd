import { siteMetadata } from '@/lib/site-metadata';

const stripTrailingSlash = (value: string) => value.replace(/\/$/, '');
const stripLeadingSlash = (value: string) => value.replace(/^\//, '');

export const absoluteUrl = (path = ''): string => {
  const baseUrl = stripTrailingSlash(siteMetadata.siteUrl);
  const normalizedPath = stripLeadingSlash(path);

  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
};

const rootUrl = () => `${absoluteUrl()}/`;
const schemaNodeUrl = (path: string) =>
  stripLeadingSlash(path) ? absoluteUrl(path) : rootUrl();

export const websiteId = () => `${rootUrl()}#website`;
export const personId = () => `${rootUrl()}#person`;
export const blogId = () => `${absoluteUrl('/article')}#blog`;
export const webpageId = (path: string) => `${schemaNodeUrl(path)}#webpage`;
export const breadcrumbId = (path: string) =>
  `${schemaNodeUrl(path)}#breadcrumb`;
export const softwareApplicationId = (slug: string) =>
  `${rootUrl()}#software-${slug}`;
export const blogPostingId = (path: string) =>
  `${schemaNodeUrl(path)}#blogposting`;
