import type { Metadata, Route } from 'next';

export type SeriesConfig = {
  name: string;
  description: string;
  contentType: 'article' | 'craft';
};

const SERIES: Record<string, SeriesConfig> = {
  'ai-coding-agent': {
    name: 'AI 코딩 에이전트',
    description: 'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
    contentType: 'article',
  },
  'synchronize-tab-scrolling': {
    name: '탭 스크롤 동기화 확장 프로그램',
    description:
      '탭 스크롤 동기화 확장 프로그램을 만들고 운영하며 배운 제품, UX, 기술적 의사결정을 다루는 시리즈',
    contentType: 'craft',
  },
};

export type SeriesContentType = SeriesConfig['contentType'];

export enum SeriesStatus {
  Unknown = 'unknown',
  KindMismatch = 'kind-mismatch',
  Empty = 'empty',
  Ready = 'ready',
}

export type SeriesQuery = {
  id: string;
  contentType: SeriesContentType;
  currentOrder?: number;
};

type SeriesSource = {
  slug: string;
  metadata: {
    title: string;
    publishedAt: string;
    series?: string;
    seriesOrder?: number;
  };
};

const NO_CURRENT_ORDER = -1;
const getSeriesConfig = (id: string): SeriesConfig | undefined =>
  Object.hasOwn(SERIES, id) ? SERIES[id] : undefined;
const seriesRoute = (id: string, kind: SeriesContentType) =>
  `/${kind}/series/${id}` as Route<''>;

function resolveConfig(query: SeriesQuery) {
  const config = getSeriesConfig(query.id);
  if (!config) {
    return { status: SeriesStatus.Unknown } as const;
  }
  if (config.contentType !== query.contentType) {
    return { status: SeriesStatus.KindMismatch } as const;
  }
  return {
    status: SeriesStatus.Ready,
    config,
    route: seriesRoute(query.id, config.contentType),
  } as const;
}

export function listSeriesRoutes(kind?: SeriesContentType) {
  return Object.entries(SERIES)
    .filter(([, config]) => !kind || config.contentType === kind)
    .map(([id, config]) => ({
      id,
      route: seriesRoute(id, config.contentType),
    }));
}

export function getSeriesMetadata(query: SeriesQuery, siteUrl: string) {
  const result = resolveConfig(query);
  if (result.status !== SeriesStatus.Ready) {
    return result;
  }
  const { config, route } = result;
  const title = `${config.name} 시리즈`;
  const url = `${siteUrl}${route}`;
  return {
    status: SeriesStatus.Ready,
    metadata: {
      title,
      description: config.description,
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        url,
        title,
        description: config.description,
      },
    } satisfies Metadata,
  } as const;
}

export type SeriesArticleEntry = {
  slug: string;
  title: string;
  order: number;
  href: Route<''>;
  publishedAt: string;
};

export type SeriesInfo = {
  id: string;
  name: string;
  description: string;
  contentType: SeriesContentType;
  route: Route<''>;
  articles: SeriesArticleEntry[];
  currentOrder: number;
  previous?: SeriesArticleEntry;
  next?: SeriesArticleEntry;
};

export type SeriesSummary = {
  id: string;
  config: SeriesConfig;
  articleCount: number;
  route: Route<''>;
};

export function resolveSeries(
  articles: ReadonlyArray<SeriesSource>,
  query: SeriesQuery
) {
  const result = resolveConfig(query);
  if (result.status !== SeriesStatus.Ready) {
    return result;
  }
  const entries = articles
    .filter(article => article.metadata.series === query.id)
    .sort(
      (a, b) => (a.metadata.seriesOrder ?? 0) - (b.metadata.seriesOrder ?? 0)
    )
    .map(article => ({
      slug: article.slug,
      title: article.metadata.title,
      order: article.metadata.seriesOrder ?? 0,
      href: `/${result.config.contentType}/${article.slug}` as Route<''>,
      publishedAt: article.metadata.publishedAt,
    }));
  if (!entries.length) {
    return { status: SeriesStatus.Empty } as const;
  }
  const currentOrder = query.currentOrder ?? NO_CURRENT_ORDER;
  const index = entries.findIndex(article => article.order === currentOrder);
  const info: SeriesInfo = {
    id: query.id,
    ...result.config,
    route: result.route,
    articles: entries,
    currentOrder,
    previous: index > 0 ? entries[index - 1] : undefined,
    next: index >= 0 ? entries[index + 1] : undefined,
  };
  return { status: SeriesStatus.Ready, info } as const;
}

const groupBySeries = (
  articles: ReadonlyArray<SeriesSource>
): Map<string, SeriesSource[]> => {
  const map = new Map<string, SeriesSource[]>();
  for (const article of articles) {
    if (article.metadata.series) {
      const list = map.get(article.metadata.series) ?? [];
      list.push(article);
      map.set(article.metadata.series, list);
    }
  }
  return map;
};

export const getSeriesBadges = (
  articles: ReadonlyArray<SeriesSource>
): Map<string, { id: string; name: string; order: number; total: number }> => {
  const badges = new Map<
    string,
    { id: string; name: string; order: number; total: number }
  >();
  for (const [seriesId, group] of groupBySeries(articles)) {
    const config = getSeriesConfig(seriesId);
    if (!config) {
      continue;
    }
    for (const article of group) {
      badges.set(article.slug, {
        id: seriesId,
        name: config.name,
        order: article.metadata.seriesOrder ?? 0,
        total: group.length,
      });
    }
  }
  return badges;
};

export const getSeriesSummaries = (
  articles: ReadonlyArray<SeriesSource>
): SeriesSummary[] =>
  [...groupBySeries(articles).entries()]
    .map(([id, group]) => {
      const config = getSeriesConfig(id);
      if (!config) {
        return null;
      }
      return {
        id,
        config,
        articleCount: group.length,
        route: seriesRoute(id, config.contentType),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
