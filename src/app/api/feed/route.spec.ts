import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GET } from '@/app/api/feed/route';
import { siteMetadata } from '@/lib/site-metadata';
import { readArticles, readCraftArticles, type Article } from '@/mdx/mdx';

const HTTP_OK = 200;
const RSS_VERSION = '2.0';
const ARTICLE: Article = {
  slug: 'rss-regression',
  content: '',
  metadata: {
    title: 'RSS & 응답 검사',
    summary: '글 <요약> 확인',
    description: 'RSS 회귀 검사',
    category: 'test',
    publishedAt: '2026-10-04',
  },
};
const CRAFT: Article = {
  ...ARTICLE,
  slug: 'rss-craft',
  metadata: { ...ARTICLE.metadata, title: 'Craft 응답 검사' },
};

vi.mock('@/mdx/mdx', () => ({
  readArticles: vi.fn(),
  readCraftArticles: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(readArticles).mockReturnValue([ARTICLE]);
  vi.mocked(readCraftArticles).mockReturnValue([CRAFT]);
});

describe('/rss.xml에 제공되는 GET /api/feed', () => {
  test('성공 상태와 XML 콘텐츠 형식으로 응답한다', async () => {
    const response = await GET();

    expect(response.status).toBe(HTTP_OK);
    expect(response.headers.get('Content-Type')).toBe('application/xml');
  });

  test('RSS 2.0 루트와 채널에 article·craft 항목을 담는다', async () => {
    const response = await GET();
    const document = new DOMParser().parseFromString(
      await response.text(),
      'application/xml'
    );

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.tagName).toBe('rss');
    expect(document.documentElement.getAttribute('version')).toBe(RSS_VERSION);
    expect(document.querySelector('rss > channel > title')?.textContent).toBe(
      siteMetadata.title
    );
    expect(document.querySelector('rss > channel > link')?.textContent).toBe(
      siteMetadata.siteUrl + '/'
    );

    const items = [...document.querySelectorAll('rss > channel > item')];

    expect(items).toHaveLength(2);
    const entries = [
      { prefix: 'article', article: ARTICLE },
      { prefix: 'craft', article: CRAFT },
    ];

    for (const [index, { prefix, article }] of entries.entries()) {
      const url = siteMetadata.siteUrl + '/' + prefix + '/' + article.slug;

      expect(items[index].querySelector('title')?.textContent).toBe(
        article.metadata.title
      );
      expect(items[index].querySelector('description')?.textContent).toBe(
        article.metadata.summary
      );
      expect(items[index].querySelector('link')?.textContent).toBe(url);
      expect(items[index].querySelector('guid')?.textContent).toBe(url);
      expect(items[index].querySelector('pubDate')?.textContent).toBe(
        new Date(article.metadata.publishedAt).toUTCString()
      );
    }
  });
});
