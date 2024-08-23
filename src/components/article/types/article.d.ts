import { type Route } from 'next';

export type ArticleInfo = {
  name: string;
  summary: string;
  href: Route<''>;
  publishedAt: string;
};
