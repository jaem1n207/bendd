import { type Route } from 'next';

export type SeriesNavigationProps = {
  id: string;
  name: string;
  description: string;
  articles: {
    slug: string;
    title: string;
    order: number;
    href: Route<''>;
  }[];
  currentOrder: number;
};
