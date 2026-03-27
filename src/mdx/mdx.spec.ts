import { type Route } from 'next';

import type { Article } from './mdx';

// --- Mock setup ---

vi.mock('@/lib/series', () => ({
  getSeriesConfig: vi.fn((id: string) => {
    const configs: Record<string, { name: string; description: string }> = {
      'ai-coding-agent': {
        name: 'AI 코딩 에이전트',
        description: 'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
      },
      'react-deep-dive': {
        name: 'React 딥다이브',
        description: 'React 내부 동작을 깊이 파헤치는 시리즈',
      },
    };
    return configs[id];
  }),
}));

// --- Test fixtures ---

const createArticle = (overrides: Partial<Article> & { slug: string }): Article => ({
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

// --- Tests ---

describe('formatDate', () => {
  let formatDate: typeof import('./mdx').formatDate;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00'));
    ({ formatDate } = await import('./mdx'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('방금 전 (1분 미만)', () => {
    const result = formatDate({ date: '2025-03-15T11:59:30', includeRelative: true });
    expect(result).toContain('방금 전');
  });

  it('N분 전 (1시간 미만)', () => {
    const result = formatDate({ date: '2025-03-15T11:30:00', includeRelative: true });
    expect(result).toContain('30분 전');
  });

  it('N시간 전 (24시간 미만)', () => {
    const result = formatDate({ date: '2025-03-15T06:00:00', includeRelative: true });
    expect(result).toContain('6시간 전');
  });

  it('하루 전', () => {
    const result = formatDate({ date: '2025-03-14', includeRelative: true });
    expect(result).toContain('하루 전');
  });

  it('N일 전 (7일 미만)', () => {
    const result = formatDate({ date: '2025-03-11', includeRelative: true });
    expect(result).toContain('4일 전');
  });

  it('일주일 전', () => {
    const result = formatDate({ date: '2025-03-08', includeRelative: true });
    expect(result).toContain('일주일 전');
  });

  it('N주 전 (4주 미만)', () => {
    const result = formatDate({ date: '2025-02-22', includeRelative: true });
    expect(result).toContain('3주 전');
  });

  it('N개월 전 (12개월 미만)', () => {
    const result = formatDate({ date: '2025-01-10', includeRelative: true });
    expect(result).toContain('2개월 전');
  });

  it('N년 전 (정확히 년 단위)', () => {
    const result = formatDate({ date: '2023-03-15', includeRelative: true });
    expect(result).toContain('2년 전');
  });

  it('N년 M개월 전', () => {
    const result = formatDate({ date: '2023-01-10', includeRelative: true });
    expect(result).toContain('2년 2개월 전');
  });

  it('includeRelative: false일 때 절대 날짜만 반환', () => {
    const result = formatDate({ date: '2025-03-14', includeRelative: false });
    expect(result).not.toContain('전');
  });

  it('T가 포함된 ISO 형식 날짜 처리', () => {
    const result = formatDate({ date: '2025-03-14T10:00:00', includeRelative: true });
    expect(result).toContain('하루 전');
  });
});

describe('findBySlug', () => {
  let findBySlug: typeof import('./mdx').findBySlug;

  beforeAll(async () => {
    ({ findBySlug } = await import('./mdx'));
  });

  it('슬러그로 글을 찾는다', () => {
    const result = findBySlug(ARTICLES, 'react-hooks');
    expect(result).toBeDefined();
    expect(result!.metadata.title).toBe('React Hooks 가이드');
  });

  it('존재하지 않는 슬러그는 undefined를 반환한다', () => {
    expect(findBySlug(ARTICLES, 'nonexistent')).toBeUndefined();
  });

  it('빈 배열에서 undefined를 반환한다', () => {
    expect(findBySlug([], 'react-hooks')).toBeUndefined();
  });
});

describe('sortByDateDesc', () => {
  let sortByDateDesc: typeof import('./mdx').sortByDateDesc;

  beforeAll(async () => {
    ({ sortByDateDesc } = await import('./mdx'));
  });

  it('날짜 내림차순으로 정렬한다', () => {
    const sorted = sortByDateDesc(ARTICLES);
    expect(sorted[0].slug).toBe('next-routing'); // 2025-03-01
    expect(sorted[1].slug).toBe('ai-agent-part2'); // 2025-02-15
  });

  it('같은 날짜일 때 seriesOrder 내림차순으로 정렬한다', () => {
    const sorted = sortByDateDesc(ARTICLES);
    // ai-agent-part1 (order 1)과 ai-agent-part3 (order 3) 모두 2025-02-01
    const sameDate = sorted.filter(a => a.metadata.publishedAt === '2025-02-01');
    expect(sameDate[0].slug).toBe('ai-agent-part3'); // order 3 먼저
    expect(sameDate[1].slug).toBe('ai-agent-part1'); // order 1 나중
  });

  it('원본 배열을 변경하지 않는다', () => {
    const original = [...ARTICLES];
    sortByDateDesc(ARTICLES);
    expect(ARTICLES).toEqual(original);
  });

  it('빈 배열을 처리한다', () => {
    expect(sortByDateDesc([])).toEqual([]);
  });
});

describe('getSeriesInfo', () => {
  let getSeriesInfo: typeof import('./mdx').getSeriesInfo;

  beforeAll(async () => {
    ({ getSeriesInfo } = await import('./mdx'));
  });

  it('시리즈 정보를 올바르게 반환한다', () => {
    const info = getSeriesInfo(ARTICLES, 'ai-coding-agent', 1);
    expect(info).toBeDefined();
    expect(info!.id).toBe('ai-coding-agent');
    expect(info!.name).toBe('AI 코딩 에이전트');
    expect(info!.currentOrder).toBe(1);
    expect(info!.articles).toHaveLength(3);
  });

  it('시리즈 글을 seriesOrder 오름차순으로 정렬한다', () => {
    const info = getSeriesInfo(ARTICLES, 'ai-coding-agent', 1);
    expect(info!.articles[0].order).toBe(1);
    expect(info!.articles[1].order).toBe(2);
    expect(info!.articles[2].order).toBe(3);
  });

  it('각 글에 올바른 href를 생성한다', () => {
    const info = getSeriesInfo(ARTICLES, 'ai-coding-agent', 1);
    expect(info!.articles[0].href).toBe('/article/ai-agent-part1');
    expect(info!.articles[1].href).toBe('/article/ai-agent-part2');
  });

  it('존재하지 않는 시리즈 ID는 undefined를 반환한다', () => {
    expect(getSeriesInfo(ARTICLES, 'nonexistent', 1)).toBeUndefined();
  });

  it('시리즈 설정은 있지만 해당 글이 없으면 undefined를 반환한다', () => {
    expect(getSeriesInfo([], 'ai-coding-agent', 1)).toBeUndefined();
  });

  it('currentOrder를 그대로 전달한다', () => {
    const info = getSeriesInfo(ARTICLES, 'ai-coding-agent', -1);
    expect(info!.currentOrder).toBe(-1);
  });
});

describe('getSeriesBadges', () => {
  let getSeriesBadges: typeof import('./mdx').getSeriesBadges;

  beforeAll(async () => {
    ({ getSeriesBadges } = await import('./mdx'));
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
  let getSeriesSummaries: typeof import('./mdx').getSeriesSummaries;

  beforeAll(async () => {
    ({ getSeriesSummaries } = await import('./mdx'));
  });

  it('시리즈 요약 목록을 반환한다', () => {
    const summaries = getSeriesSummaries(ARTICLES);
    expect(summaries).toHaveLength(1); // ai-coding-agent만
    expect(summaries[0]).toEqual({
      id: 'ai-coding-agent',
      config: {
        name: 'AI 코딩 에이전트',
        description: 'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
      },
      articleCount: 3,
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

describe('formatArticlesForDisplay', () => {
  let formatArticlesForDisplay: typeof import('./mdx').formatArticlesForDisplay;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00'));
    ({ formatArticlesForDisplay } = await import('./mdx'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('글 목록을 ArticleInfo 형태로 변환한다', () => {
    const result = formatArticlesForDisplay(ARTICLES.slice(0, 1), ARTICLES);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'React Hooks 가이드',
      summary: 'Hooks 가이드',
      href: '/article/react-hooks',
    });
  });

  it('시리즈 글에 배지를 포함한다', () => {
    const seriesArticles = ARTICLES.filter(a => a.slug === 'ai-agent-part1');
    const result = formatArticlesForDisplay(seriesArticles, ARTICLES);
    expect(result[0].series).toEqual({
      id: 'ai-coding-agent',
      name: 'AI 코딩 에이전트',
      order: 1,
      total: 3,
    });
  });

  it('시리즈가 아닌 글에는 배지가 없다', () => {
    const nonSeries = ARTICLES.filter(a => a.slug === 'react-hooks');
    const result = formatArticlesForDisplay(nonSeries, ARTICLES);
    expect(result[0].series).toBeUndefined();
  });

  it('displayArticles와 allArticlesForBadges를 구분한다', () => {
    const displayOnly = ARTICLES.slice(0, 2); // react-hooks, next-routing
    const result = formatArticlesForDisplay(displayOnly, ARTICLES);
    expect(result).toHaveLength(2);
  });

  it('/article/ 경로를 사용한다', () => {
    const result = formatArticlesForDisplay(ARTICLES.slice(0, 1), ARTICLES);
    expect(result[0].href).toBe('/article/react-hooks' as Route<''>);
  });
});

describe('formatCraftsForDisplay', () => {
  let formatCraftsForDisplay: typeof import('./mdx').formatCraftsForDisplay;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00'));
    ({ formatCraftsForDisplay } = await import('./mdx'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('글 목록을 ArticleInfo 형태로 변환한다', () => {
    const result = formatCraftsForDisplay(ARTICLES.slice(0, 1));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'React Hooks 가이드',
      summary: 'Hooks 가이드',
    });
  });

  it('/craft/ 경로를 사용한다', () => {
    const result = formatCraftsForDisplay(ARTICLES.slice(0, 1));
    expect(result[0].href).toBe('/craft/react-hooks' as Route<''>);
  });

  it('시리즈 배지를 포함하지 않는다', () => {
    const seriesArticles = ARTICLES.filter(a => a.slug === 'ai-agent-part1');
    const result = formatCraftsForDisplay(seriesArticles);
    expect(result[0].series).toBeUndefined();
  });

  it('빈 배열을 처리한다', () => {
    expect(formatCraftsForDisplay([])).toEqual([]);
  });
});

describe('readArticles', () => {
  let readArticles: typeof import('./mdx').readArticles;
  let fs: typeof import('node:fs');

  beforeAll(async () => {
    vi.mock('node:fs');
    fs = await import('node:fs');
    ({ readArticles } = await import('./mdx'));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('content 디렉토리에서 MDX 파일을 읽는다', () => {
    const mockDirents = [
      { name: 'test-article.mdx', isDirectory: () => false },
      { name: 'not-mdx.txt', isDirectory: () => false },
    ];
    vi.mocked(fs.readdirSync).mockReturnValue(mockDirents as any);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `---\ntitle: '테스트'\npublishedAt: '2025-01-01'\ncategory: 'react'\ndescription: '테스트 설명'\nsummary: '테스트 요약'\n---\n# 내용`
    );

    const articles = readArticles('/mock/content');
    expect(articles).toHaveLength(1);
    expect(articles[0].slug).toBe('test-article');
    expect(articles[0].metadata.title).toBe('테스트');
  });

  it('.mdx가 아닌 파일은 무시한다', () => {
    const mockDirents = [
      { name: 'readme.md', isDirectory: () => false },
      { name: 'config.json', isDirectory: () => false },
    ];
    vi.mocked(fs.readdirSync).mockReturnValue(mockDirents as any);

    const articles = readArticles('/mock/content');
    expect(articles).toHaveLength(0);
  });
});
