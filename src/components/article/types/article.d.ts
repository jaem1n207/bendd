import { type Route } from 'next';

export type SeriesBadge = {
  id: string;
  name: string;
  order: number;
  total: number;
};

export type ArticleInfo = {
  name: string;
  summary: string;
  href: Route<''>;
  publishedAt: string;
  series?: SeriesBadge;
};
