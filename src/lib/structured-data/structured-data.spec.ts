/* eslint-disable playwright/no-standalone-expect */
import type { Route } from 'next';
import type { SeriesInfo } from '@/mdx/mdx';
import type { Graph, Thing } from 'schema-dts';
import { describe, expect, it } from 'vitest';

import {
  createArticleDetailGraph,
  createArticleIndexGraph,
  createCraftDetailGraph,
  createCraftIndexGraph,
  createHomeGraph,
  createSeriesGraph,
} from '@/lib/structured-data/graphs';
import {
  absoluteUrl,
  blogId,
  blogPostingId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from '@/lib/structured-data/ids';

type NodeWithType = Thing & { '@id'?: string; '@type': string | string[] };
type NodeLookupResult = NodeWithType & Record<string, unknown>;

const findNode = (graph: Graph, type: string): NodeLookupResult => {
  const node = graph['@graph'].find(item => {
    const itemType = (item as NodeWithType)['@type'];

    return Array.isArray(itemType)
      ? itemType.includes(type)
      : itemType === type;
  });

  if (!node) {
    throw new Error(`Missing ${type} node`);
  }

  return node as NodeLookupResult;
};

const article = {
  slug: 'structured-data',
  content: '',
  metadata: {
    title: '구조화 데이터',
    publishedAt: '2026-06-22',
    category: 'seo',
    description: '검색 엔진이 글을 이해하도록 돕는 JSON-LD 개선',
    summary: 'JSON-LD 개선',
  },
};

const seriesInfo = {
  id: 'ai-coding-agent',
  name: 'AI Coding Agent',
  description: 'AI 코딩 에이전트 활용 방법을 다루는 시리즈',
  contentType: 'article',
  route: '/article/series/ai-coding-agent' as Route<''>,
  currentOrder: 1,
  articles: [
    {
      slug: 'agent-second',
      title: '두 번째 글',
      order: 2,
      href: '/article/agent-second' as Route<''>,
      publishedAt: '2026-06-22',
    },
    {
      slug: 'agent-first',
      title: '첫 번째 글',
      order: 1,
      href: '/article/agent-first' as Route<''>,
      publishedAt: '2026-06-21',
    },
  ],
} satisfies SeriesInfo;

const craftSeriesInfo = {
  id: 'synchronize-tab-scrolling',
  name: '탭 스크롤 동기화 확장 프로그램',
  description: '스크롤 동기화 확장 프로그램을 만들고 운영하며 배운 과정',
  contentType: 'craft',
  route: '/craft/series/synchronize-tab-scrolling' as Route<''>,
  currentOrder: 1,
  articles: [
    {
      slug: 'synchronize-tab-scrolling-product-story',
      title:
        '원문과 번역문을 함께 읽기 위해 만든 확장 프로그램이 제품이 되기까지',
      order: 1,
      href: '/craft/synchronize-tab-scrolling-product-story' as Route<''>,
      publishedAt: '2026-07-08',
    },
  ],
} satisfies SeriesInfo;

describe('structured data ID helpers', () => {
  it('creates stable absolute URLs and schema node IDs', () => {
    expect(absoluteUrl('/article')).toBe('https://bendd.me/article');
    expect(absoluteUrl('//article')).toBe('https://bendd.me/article');
    expect(absoluteUrl('craft/demo')).toBe('https://bendd.me/craft/demo');
    expect(websiteId()).toBe('https://bendd.me/#website');
    expect(personId()).toBe('https://bendd.me/#person');
    expect(blogId()).toBe('https://bendd.me/article#blog');
    expect(webpageId('/article')).toBe('https://bendd.me/article#webpage');
    expect(webpageId('/')).toBe('https://bendd.me/#webpage');
    expect(breadcrumbId('/article')).toBe(
      'https://bendd.me/article#breadcrumb'
    );
    expect(breadcrumbId('/')).toBe('https://bendd.me/#breadcrumb');
    expect(softwareApplicationId('sync-tabs')).toBe(
      'https://bendd.me/#software-sync-tabs'
    );
    expect(blogPostingId('/article/foo')).toBe(
      'https://bendd.me/article/foo#blogposting'
    );
  });
});

describe('structured data graphs', () => {
  it('creates a home graph with profile and software application nodes', () => {
    const graph = createHomeGraph({
      project: {
        slug: 'synchronize-tab-scrolling',
        name: 'Synchronize Tab Scrolling',
        description: '여러 탭의 스크롤을 실시간으로 동기화합니다.',
        url: 'https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc',
        sameAs: 'https://github.com/jaem1n207/synchronize-tab-scrolling',
      },
    });

    const website = findNode(graph, 'WebSite');
    const person = findNode(graph, 'Person');
    const profilePage = findNode(graph, 'ProfilePage');
    const softwareApplication = findNode(graph, 'SoftwareApplication');

    expect(website['@id']).toBe('https://bendd.me/#website');
    expect(website.publisher).toEqual({ '@id': 'https://bendd.me/#person' });
    expect(person['@id']).toBe('https://bendd.me/#person');
    expect(profilePage.isPartOf).toEqual({
      '@id': 'https://bendd.me/#website',
    });
    expect(profilePage.mainEntity).toEqual({
      '@id': 'https://bendd.me/#person',
    });
    expect(softwareApplication['@id']).toBe(
      'https://bendd.me/#software-synchronize-tab-scrolling'
    );
    expect(softwareApplication.creator).toEqual({
      '@id': 'https://bendd.me/#person',
    });
  });

  it('links article postings to the article blog and webpage', () => {
    const graph = createArticleDetailGraph({ post: article });
    const posting = findNode(graph, 'BlogPosting');
    const webpage = findNode(graph, 'WebPage');

    expect(posting.mainEntityOfPage).toEqual({ '@id': webpage['@id'] });
    expect(posting.isPartOf).toEqual({
      '@id': 'https://bendd.me/article#blog',
    });
    expect(posting.author).toEqual({ '@id': 'https://bendd.me/#person' });
    expect(posting.publisher).toEqual({ '@id': 'https://bendd.me/#person' });
    expect(posting.image).toMatchObject({
      '@type': 'ImageObject',
      url: 'https://bendd.me/api/og?title=%EA%B5%AC%EC%A1%B0%ED%99%94%20%EB%8D%B0%EC%9D%B4%ED%84%B0',
    });
  });

  it('links craft postings to the website instead of the article blog', () => {
    const graph = createCraftDetailGraph({ post: article });
    const posting = findNode(graph, 'BlogPosting');

    expect(posting.isPartOf).toEqual({ '@id': 'https://bendd.me/#website' });
  });

  it('creates stable item list entries for article collections', () => {
    const graph = createArticleIndexGraph({ articles: [article] });
    const collection = findNode(graph, 'CollectionPage');

    expect(collection.mainEntity).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://bendd.me/article/structured-data',
          name: '구조화 데이터',
        },
      ],
    });
  });

  it('links craft collections to their page and breadcrumb nodes', () => {
    const graph = createCraftIndexGraph({ articles: [article] });
    const collection = findNode(graph, 'CollectionPage');

    expect(collection['@id']).toBe('https://bendd.me/craft#webpage');
    expect(collection.url).toBe('https://bendd.me/craft');
    expect(collection.breadcrumb).toEqual({
      '@id': 'https://bendd.me/craft#breadcrumb',
    });
    expect(collection.mainEntity).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://bendd.me/craft/structured-data',
          name: '구조화 데이터',
        },
      ],
    });
  });

  it('links series collections to their page and preserves article order values', () => {
    const graph = createSeriesGraph({ seriesInfo });
    const collection = findNode(graph, 'CollectionPage');

    expect(collection['@id']).toBe(
      'https://bendd.me/article/series/ai-coding-agent#webpage'
    );
    expect(collection.url).toBe(
      'https://bendd.me/article/series/ai-coding-agent'
    );
    expect(collection.breadcrumb).toEqual({
      '@id': 'https://bendd.me/article/series/ai-coding-agent#breadcrumb',
    });
    expect(collection.mainEntity).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 2,
          url: 'https://bendd.me/article/agent-second',
          name: '두 번째 글',
        },
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://bendd.me/article/agent-first',
          name: '첫 번째 글',
        },
      ],
    });
  });

  it('links craft series collections to craft paths and breadcrumbs', () => {
    const graph = createSeriesGraph({ seriesInfo: craftSeriesInfo });
    const collection = findNode(graph, 'CollectionPage');

    expect(collection['@id']).toBe(
      'https://bendd.me/craft/series/synchronize-tab-scrolling#webpage'
    );
    expect(collection.url).toBe(
      'https://bendd.me/craft/series/synchronize-tab-scrolling'
    );
    expect(collection.breadcrumb).toEqual({
      '@id':
        'https://bendd.me/craft/series/synchronize-tab-scrolling#breadcrumb',
    });
    expect(collection.mainEntity).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://bendd.me/craft/synchronize-tab-scrolling-product-story',
          name: '원문과 번역문을 함께 읽기 위해 만든 확장 프로그램이 제품이 되기까지',
        },
      ],
    });
  });
});
