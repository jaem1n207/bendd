export type SeriesConfig = {
  name: string;
  description: string;
};

export const SERIES: Record<string, SeriesConfig> = {
  'ai-coding-agent': {
    name: 'AI 코딩 에이전트',
    description:
      'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
  },
};

export const getSeriesConfig = (id: string): SeriesConfig | undefined =>
  SERIES[id];

export const getAllSeriesIds = (): string[] => Object.keys(SERIES);
