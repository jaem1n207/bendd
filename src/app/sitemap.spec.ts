/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it, vi } from 'vitest';

import type { Article } from '@/mdx/mdx';

vi.mock('@/lib/series', () => ({
  getAllSeriesIds: vi.fn(() => ['ai-coding-agent']),
}));

vi.mock('@/lib/site-metadata', () => ({
  siteMetadata: { siteUrl: 'https://bendd.me' },
}));

const createArticle = (slug: string, publishedAt: string): Article =>
  ({
    slug,
    content: '',
    metadata: {
      title: '테스트',
      publishedAt,
      category: 'react',
      description: '설명',
      summary: '요약',
    },
  }) as Article;

vi.mock('@/mdx/mdx', () => ({
  readArticles: vi.fn(() => [
    createArticle('first-post', '2025-01-10'),
    createArticle('second-post', '2025-02-20'),
  ]),
  readCraftArticles: vi.fn(() => [createArticle('craft-demo', '2025-03-01')]),
}));

import sitemap from './sitemap';

describe('sitemap', () => {
  it('정적 라우트(홈, craft, article)를 포함한다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);

    expect(urls).toContain('https://bendd.me/');
    expect(urls).toContain('https://bendd.me/craft');
    expect(urls).toContain('https://bendd.me/article');
  });

  it('개별 article URL을 포함한다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);

    expect(urls).toContain('https://bendd.me/article/first-post');
    expect(urls).toContain('https://bendd.me/article/second-post');
  });

  it('개별 craft URL을 포함한다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);

    expect(urls).toContain('https://bendd.me/craft/craft-demo');
  });

  it('시리즈 랜딩 페이지 URL을 포함한다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);

    expect(urls).toContain('https://bendd.me/article/series/ai-coding-agent');
  });

  it('article의 lastModified는 publishedAt을 사용한다', () => {
    const entries = sitemap();
    const articleEntry = entries.find(e => e.url.endsWith('/first-post'));

    expect(articleEntry?.lastModified).toBe('2025-01-10');
  });

  it('craft의 lastModified는 publishedAt을 사용한다', () => {
    const entries = sitemap();
    const craftEntry = entries.find(e => e.url.endsWith('/craft-demo'));

    expect(craftEntry?.lastModified).toBe('2025-03-01');
  });

  it('정적 라우트와 시리즈의 lastModified는 오늘 날짜를 사용한다', () => {
    const today = new Date().toISOString().split('T')[0];
    const entries = sitemap();

    const homeEntry = entries.find(e => e.url === 'https://bendd.me/');
    const seriesEntry = entries.find(e =>
      e.url.includes('/article/series/ai-coding-agent')
    );

    expect(homeEntry?.lastModified).toBe(today);
    expect(seriesEntry?.lastModified).toBe(today);
  });

  it('playground URL은 포함하지 않는다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);
    const playgroundUrls = urls.filter(url => url.includes('/playground'));

    expect(playgroundUrls).toHaveLength(0);
  });

  it('중복 URL이 없다', () => {
    const entries = sitemap();
    const urls = entries.map(e => e.url);
    const unique = new Set(urls);

    expect(unique.size).toBe(urls.length);
  });

  it('모든 URL이 siteUrl로 시작한다', () => {
    const entries = sitemap();

    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/bendd\.me\//);
    }
  });
});
