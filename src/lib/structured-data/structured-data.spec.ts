/* eslint-disable playwright/no-standalone-expect */
import type { Graph, Thing } from 'schema-dts';
import { describe, expect, it } from 'vitest';

import {
  createArticleDetailGraph,
  createArticleIndexGraph,
  createCraftDetailGraph,
  createHomeGraph,
} from './graphs';
import {
  absoluteUrl,
  blogId,
  blogPostingId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from './ids';

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
});
