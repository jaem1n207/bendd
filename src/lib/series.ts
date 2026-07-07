export type SeriesConfig = {
  name: string;
  description: string;
  contentType: 'article' | 'craft';
};

export const SERIES: Record<string, SeriesConfig> = {
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

export const getSeriesConfig = (id: string): SeriesConfig | undefined =>
  SERIES[id];

export type SeriesContentType = SeriesConfig['contentType'];

export const getAllSeriesIds = (contentType?: SeriesContentType): string[] =>
  Object.entries(SERIES)
    .filter(([, config]) => !contentType || config.contentType === contentType)
    .map(([id]) => id);

export const seriesRoute = (
  id: string,
  contentType: SeriesContentType = getSeriesConfig(id)?.contentType ?? 'article'
) => `/${contentType}/series/${id}` as import('next').Route<''>;
