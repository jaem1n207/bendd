import { getArticles } from '@/app/article/utils';
import { siteMetadata } from '@/lib/site-metadata';
import type { NextRequest } from 'next/server';

type RssEntry = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  guid?: string;
};

interface Option {
  title: string;
  description: string;
  lang: string;
  link: string;
  entries: RssEntry[];
}

export async function GET(req: NextRequest) {
  const articles = getArticles();

  const entries: RssEntry[] = articles.map(article => {
    return {
      title: article.metadata.title,
      link: `${siteMetadata.siteUrl}/article/${article.slug}`,
      description: article.metadata.summary,
      pubDate: new Date(article.metadata.publishedAt).toUTCString(),
      guid: `${siteMetadata.siteUrl}/article/${article.slug}`,
    };
  });
}
