/* eslint-disable playwright/no-standalone-expect -- This file uses Vitest. */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  resolveSeries,
  SeriesStatus,
  getSeriesMetadata,
  listSeriesRoutes,
} from '@/lib/series';
import type { Article } from '@/mdx/mdx';

const createArticle = (
  overrides: Partial<Article> & { slug: string }
): Article => ({
  metadata: {
    title: '테스트 글',
    publishedAt: '2025-01-15',
    category: 'react',
    description: '테스트용 설명입니다.',
    summary: '테스트 요약',
    ...overrides.metadata,
  } as Article['metadata'],
  slug: overrides.slug,
  content: overrides.content ?? '# 테스트 내용',
});

const ARTICLES: ReadonlyArray<Article> = [
  createArticle({
    slug: 'react-hooks',
    metadata: {
      title: 'React Hooks 가이드',
      publishedAt: '2025-01-10',
      category: 'react',
      description: 'React Hooks 완벽 가이드',
      summary: 'Hooks 가이드',
    },
  }),
  createArticle({
    slug: 'next-routing',
    metadata: {
      title: 'Next.js 라우팅',
      publishedAt: '2025-03-01',
      category: 'nextjs',
      description: 'Next.js App Router 라우팅 가이드',
      summary: '라우팅 가이드',
    },
  }),
  createArticle({
    slug: 'ai-agent-part1',
    metadata: {
      title: 'AI 에이전트 입문',
      publishedAt: '2025-02-01',
      category: 'ai',
      description: 'AI 코딩 에이전트 시리즈 첫 번째',
      summary: '에이전트 입문',
      series: 'ai-coding-agent',
      seriesOrder: 1,
    },
  }),
  createArticle({
    slug: 'ai-agent-part2',
    metadata: {
      title: 'AI 에이전트 활용',
      publishedAt: '2025-02-15',
      category: 'ai',
      description: 'AI 코딩 에이전트 시리즈 두 번째',
      summary: '에이전트 활용',
      series: 'ai-coding-agent',
      seriesOrder: 2,
    },
  }),
  createArticle({
    slug: 'ai-agent-part3',
    metadata: {
      title: 'AI 에이전트 심화',
      publishedAt: '2025-02-01',
      category: 'ai',
      description: 'AI 코딩 에이전트 시리즈 세 번째',
      summary: '에이전트 심화',
      series: 'ai-coding-agent',
      seriesOrder: 3,
    },
  }),
];

const CRAFT_ARTICLES: ReadonlyArray<Article> = [
  createArticle({
    slug: 'synchronize-tab-scrolling-product-story',
    metadata: {
      title: '스크롤 동기화 확장 프로그램 개발기',
      publishedAt: '2026-07-08',
      category: 'craft',
      description: '스크롤 동기화 확장 프로그램을 제품처럼 운영한 과정',
      summary: '개인 도구가 제품이 된 과정',
      series: 'synchronize-tab-scrolling',
      seriesOrder: 1,
    },
  }),
];

describe('series policy', () => {
  const query = { id: 'ai-coding-agent', contentType: 'article' as const };
  it('resolves sorted entries and their routes without mutating the collection', () => {
    const original = [...ARTICLES];
    const result = resolveSeries(ARTICLES, { ...query, currentOrder: 2 });
    expect(result.status).toBe(SeriesStatus.Ready);
    if (result.status !== SeriesStatus.Ready) {
      throw new Error('Expected ready series');
    }
    expect(result.info).toMatchObject({
      id: query.id,
      name: 'AI 코딩 에이전트',
      contentType: 'article',
      route: '/article/series/ai-coding-agent',
      currentOrder: 2,
    });
    expect(result.info.articles.map(article => article.order)).toEqual([
      1, 2, 3,
    ]);
    expect(result.info.articles.map(article => article.href)).toEqual([
      '/article/ai-agent-part1',
      '/article/ai-agent-part2',
      '/article/ai-agent-part3',
    ]);
    expect(result.info.previous?.order).toBe(1);
    expect(result.info.next?.order).toBe(3);
    expect(ARTICLES).toEqual(original);
  });
  it.each([
    [1, undefined, 2],
    [2, 1, 3],
    [3, 2, undefined],
    [-1, undefined, undefined],
  ])('resolves neighbors for order %s', (currentOrder, previous, next) => {
    const result = resolveSeries(ARTICLES, { ...query, currentOrder });
    if (result.status !== SeriesStatus.Ready) {
      throw new Error('Expected ready series');
    }
    expect(result.info.previous?.order).toBe(previous);
    expect(result.info.next?.order).toBe(next);
  });
  it('preserves first-match behavior for duplicate orders', () => {
    const entries = [
      ARTICLES.find(article => article.metadata.seriesOrder === 1)!,
      ARTICLES.find(article => article.metadata.seriesOrder === 1)!,
    ];
    const result = resolveSeries(entries, { ...query, currentOrder: 1 });
    if (result.status !== SeriesStatus.Ready) {
      throw new Error('Expected ready series');
    }
    expect(result.info.previous).toBeUndefined();
    expect(result.info.next?.order).toBe(1);
  });
  it('keeps unknown, mismatched, empty and ready states distinct', () => {
    expect(resolveSeries(ARTICLES, { ...query, id: 'missing' }).status).toBe(
      SeriesStatus.Unknown
    );
    expect(
      resolveSeries(ARTICLES, { ...query, contentType: 'craft' }).status
    ).toBe(SeriesStatus.KindMismatch);
    expect(resolveSeries([], query).status).toBe(SeriesStatus.Empty);
    const ready = resolveSeries(ARTICLES, query);
    if (ready.status !== SeriesStatus.Ready) {
      throw new Error('Expected ready series');
    }
    expect(ready.info.currentOrder).toBe(-1);
  });
  it('builds craft series and entry URLs', () => {
    const result = resolveSeries(CRAFT_ARTICLES, {
      id: 'synchronize-tab-scrolling',
      contentType: 'craft',
    });
    if (result.status !== SeriesStatus.Ready) {
      throw new Error('Expected ready series');
    }
    expect(result.info.route).toBe('/craft/series/synchronize-tab-scrolling');
    expect(result.info.articles[0].href).toBe(
      '/craft/synchronize-tab-scrolling-product-story'
    );
  });
  it('creates metadata without a content collection and shares routes with static generation', () => {
    for (const kind of ['article', 'craft'] as const) {
      const routes = listSeriesRoutes(kind);
      expect(routes).toHaveLength(1);
      const { id, route } = routes[0];
      const result = getSeriesMetadata(
        { id, contentType: kind },
        'https://bendd.me'
      );
      if (result.status !== SeriesStatus.Ready) {
        throw new Error('Expected ready metadata');
      }
      expect(result.metadata.alternates.canonical).toBe(
        `https://bendd.me${route}`
      );
      expect(result.metadata.openGraph.url).toBe(`https://bendd.me${route}`);
    }
    expect(listSeriesRoutes()).toHaveLength(2);
    expect(
      getSeriesMetadata({ ...query, id: 'missing' }, 'https://bendd.me').status
    ).toBe(SeriesStatus.Unknown);
    expect(
      getSeriesMetadata({ ...query, contentType: 'craft' }, 'https://bendd.me')
        .status
    ).toBe(SeriesStatus.KindMismatch);
  });
});

describe('getSeriesBadges', () => {
  let getSeriesBadges: typeof import('@/lib/series').getSeriesBadges;

  beforeAll(async () => {
    ({ getSeriesBadges } = await import('@/lib/series'));
  });

  it('시리즈에 속한 글의 배지를 반환한다', () => {
    const badges = getSeriesBadges(ARTICLES);
    expect(badges.size).toBe(3); // 3개의 시리즈 글

    const badge = badges.get('ai-agent-part1');
    expect(badge).toEqual({
      id: 'ai-coding-agent',
      name: 'AI 코딩 에이전트',
      order: 1,
      total: 3,
    });
  });

  it('시리즈에 속하지 않은 글은 배지가 없다', () => {
    const badges = getSeriesBadges(ARTICLES);
    expect(badges.has('react-hooks')).toBe(false);
    expect(badges.has('next-routing')).toBe(false);
  });

  it('total은 해당 시리즈의 전체 글 수를 반영한다', () => {
    const badges = getSeriesBadges(ARTICLES);
    expect(badges.get('ai-agent-part1')!.total).toBe(3);
    expect(badges.get('ai-agent-part2')!.total).toBe(3);
    expect(badges.get('ai-agent-part3')!.total).toBe(3);
  });

  it('빈 배열이면 빈 맵을 반환한다', () => {
    expect(getSeriesBadges([]).size).toBe(0);
  });

  it('설정이 없는 시리즈 ID의 글은 무시한다', () => {
    const articles = [
      createArticle({
        slug: 'unknown-series',
        metadata: {
          title: '알 수 없는 시리즈',
          publishedAt: '2025-01-01',
          category: 'etc',
          description: '알 수 없는 시리즈에 속한 글',
          summary: '알 수 없는 시리즈',
          series: 'nonexistent-series',
          seriesOrder: 1,
        },
      }),
    ];
    const badges = getSeriesBadges(articles);
    expect(badges.size).toBe(0);
  });
});

describe('getSeriesSummaries', () => {
  let getSeriesSummaries: typeof import('@/lib/series').getSeriesSummaries;

  beforeAll(async () => {
    ({ getSeriesSummaries } = await import('@/lib/series'));
  });

  it('시리즈 요약 목록을 반환한다', () => {
    const summaries = getSeriesSummaries(ARTICLES);
    expect(summaries).toHaveLength(1); // ai-coding-agent만
    expect(summaries[0]).toEqual({
      id: 'ai-coding-agent',
      config: {
        name: 'AI 코딩 에이전트',
        description:
          'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
        contentType: 'article',
      },
      articleCount: 3,
      route: '/article/series/ai-coding-agent',
    });
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(getSeriesSummaries([])).toEqual([]);
  });

  it('시리즈가 없는 글만 있으면 빈 배열을 반환한다', () => {
    const nonSeriesArticles = ARTICLES.filter(a => !a.metadata.series);
    expect(getSeriesSummaries(nonSeriesArticles)).toEqual([]);
  });

  it('설정이 없는 시리즈 ID는 결과에 포함하지 않는다', () => {
    const articles = [
      createArticle({
        slug: 'unknown',
        metadata: {
          title: '알 수 없는',
          publishedAt: '2025-01-01',
          category: 'etc',
          description: '알 수 없는 시리즈에 속한 글',
          summary: '알 수 없는',
          series: 'nonexistent-series',
          seriesOrder: 1,
        },
      }),
    ];
    expect(getSeriesSummaries(articles)).toEqual([]);
  });
});
