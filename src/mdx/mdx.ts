import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { type Route } from 'next';

import type { ArticleInfo } from '@/components/article/types/article';
import {
  getSeriesConfig,
  seriesRoute,
  type SeriesConfig,
  type SeriesContentType,
} from '@/lib/series';

const MetadataSchema = z
  .object({
    title: z.string().max(38),
    publishedAt: z.string(),
    category: z.string(),
    description: z.string().max(150),
    summary: z.string().max(40),
    image: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.coerce.number().int().positive().optional(),
  })
  .refine(data => !data.series || data.seriesOrder != null, {
    message: 'series가 설정된 글에는 seriesOrder가 필수입니다.',
    path: ['seriesOrder'],
  });

type Metadata = z.infer<typeof MetadataSchema>;
export type Article = { metadata: Metadata; slug: string; content: string };

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
};

export type SeriesSummary = {
  id: string;
  config: SeriesConfig;
  articleCount: number;
};

const validateMetadata = (metadata: Metadata): Metadata => {
  try {
    return MetadataSchema.parse(metadata);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('front matter 유효성 검사에 실패했어요:');
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw error;
  }
};

const parseFrontmatter = (fileContent: string) => {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(fileContent);
  if (!match) {
    throw new Error('MDX 파일에서 front matter를 찾지 못했어요.');
  }

  const frontMatterBlock = match[1];
  const content = fileContent.replace(frontmatterRegex, '').trim();
  const frontMatterLines = frontMatterBlock.trim().split('\n');
  const metadata = frontMatterLines.reduce((acc, line) => {
    const [key, ...valueArr] = line.split(': ');
    const value = valueArr
      .join(': ')
      .trim()
      .replace(/^['"](.*)['"]$/, '$1');
    return { ...acc, [key.trim()]: value };
  }, {} as Metadata);

  return { metadata, content };
};

const getMDXFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(file =>
      file.isDirectory()
        ? getMDXFiles(path.join(dir, file.name))
        : file.name.endsWith('.mdx')
          ? [path.join(dir, file.name)]
          : []
    );

const readMDXFile = (filePath: string): Article => {
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const { metadata, content } = parseFrontmatter(rawContent);
  const validatedMetadata = validateMetadata(metadata);
  const slug = path.basename(filePath, path.extname(filePath));
  return { metadata: validatedMetadata, slug, content };
};

export const formatDate = ({
  date,
  includeRelative = false,
}: {
  date: string;
  includeRelative?: boolean;
}) => {
  const currentDate = new Date();
  const targetDate = new Date(date.includes('T') ? date : `${date}T00:00:00`);

  const diffInMs = currentDate.getTime() - targetDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  let relativeDate: string;

  // 1분 미만
  if (diffInMinutes < 1) {
    relativeDate = '방금 전';
  }
  // 1시간 미만
  else if (diffInMinutes < 60) {
    relativeDate = `${diffInMinutes}분 전`;
  }
  // 24시간 미만
  else if (diffInHours < 24) {
    relativeDate = `${diffInHours}시간 전`;
  }
  // 1일
  else if (diffInDays === 1) {
    relativeDate = '하루 전';
  }
  // 7일 미만
  else if (diffInDays < 7) {
    relativeDate = `${diffInDays}일 전`;
  }
  // 4주 미만
  else if (diffInDays < 28) {
    const weeks = Math.floor(diffInDays / 7);
    relativeDate = weeks === 1 ? '일주일 전' : `${weeks}주 전`;
  }
  // 월/년 계산
  else {
    // 정확한 월 계산
    let years = currentDate.getFullYear() - targetDate.getFullYear();
    let months = currentDate.getMonth() - targetDate.getMonth();

    // 일자까지 고려한 정확한 월 계산
    if (currentDate.getDate() < targetDate.getDate()) {
      months--;
    }

    // 음수 월을 년에서 차감
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMonths = years * 12 + months;

    if (totalMonths < 12) {
      relativeDate = `${totalMonths}개월 전`;
    } else if (months === 0) {
      relativeDate = `${years}년 전`;
    } else {
      relativeDate = `${years}년 ${months}개월 전`;
    }
  }

  const fullDate = targetDate.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

  return includeRelative ? `${fullDate} (${relativeDate})` : fullDate;
};

// --- 데이터 로딩 ---

export const readArticles = (dir?: string): ReadonlyArray<Article> =>
  getMDXFiles(dir ?? path.join(process.cwd(), 'content')).map(readMDXFile);

export const readCraftArticles = (): ReadonlyArray<Article> =>
  getMDXFiles(path.join(process.cwd(), 'craft')).map(readMDXFile);

// --- 조회 ---

export const findBySlug = (
  articles: ReadonlyArray<Article>,
  slug: string
): Article | undefined => articles.find(article => article.slug === slug);

// --- 정렬 ---

export const sortByDateDesc = (
  articles: ReadonlyArray<Article>
): ReadonlyArray<Article> =>
  [...articles].sort((a, b) => {
    const dateDiff =
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.metadata.seriesOrder ?? 0) - (a.metadata.seriesOrder ?? 0);
  });

// --- 시리즈 ---

const groupBySeries = (
  articles: ReadonlyArray<Article>
): Map<string, Article[]> => {
  const map = new Map<string, Article[]>();
  for (const article of articles) {
    if (article.metadata.series) {
      const list = map.get(article.metadata.series) ?? [];
      list.push(article);
      map.set(article.metadata.series, list);
    }
  }
  return map;
};

export const getSeriesInfo = (
  articles: ReadonlyArray<Article>,
  seriesId: string,
  currentOrder: number,
  options: { contentType?: SeriesContentType } = {}
): SeriesInfo | undefined => {
  const config = getSeriesConfig(seriesId);
  if (!config) return undefined;
  if (options.contentType && config.contentType !== options.contentType) {
    return undefined;
  }

  const hrefPrefix = config.contentType === 'craft' ? '/craft' : '/article';

  const seriesArticles = articles
    .filter(a => a.metadata.series === seriesId)
    .sort(
      (a, b) => (a.metadata.seriesOrder ?? 0) - (b.metadata.seriesOrder ?? 0)
    )
    .map(a => ({
      slug: a.slug,
      title: a.metadata.title,
      order: a.metadata.seriesOrder ?? 0,
      href: `${hrefPrefix}/${a.slug}` as Route<''>,
      publishedAt: a.metadata.publishedAt,
    }));

  if (seriesArticles.length === 0) return undefined;

  return {
    id: seriesId,
    name: config.name,
    description: config.description,
    contentType: config.contentType,
    route: seriesRoute(seriesId, config.contentType),
    articles: seriesArticles,
    currentOrder,
  };
};

export const getSeriesBadges = (
  articles: ReadonlyArray<Article>
): Map<string, { id: string; name: string; order: number; total: number }> => {
  const badges = new Map<
    string,
    { id: string; name: string; order: number; total: number }
  >();
  for (const [seriesId, group] of groupBySeries(articles)) {
    const config = getSeriesConfig(seriesId);
    if (!config) continue;
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
  articles: ReadonlyArray<Article>
): SeriesSummary[] =>
  [...groupBySeries(articles).entries()]
    .map(([id, group]) => {
      const config = getSeriesConfig(id);
      if (!config) return null;
      return { id, config, articleCount: group.length };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

// --- 포맷팅 ---

export const formatArticlesForDisplay = (
  displayArticles: ReadonlyArray<Article>,
  allArticlesForBadges: ReadonlyArray<Article>,
  options: { includeRelativeDate?: boolean } = {}
): ArticleInfo[] => {
  const badges = getSeriesBadges(allArticlesForBadges);
  return displayArticles.map(article => ({
    name: article.metadata.title,
    summary: article.metadata.summary,
    href: `/article/${article.slug}` as Route<''>,
    publishedAt: formatDate({
      date: article.metadata.publishedAt,
      includeRelative: options.includeRelativeDate,
    }),
    ...(badges.has(article.slug) && { series: badges.get(article.slug) }),
  }));
};

export const formatCraftsForDisplay = (
  articles: ReadonlyArray<Article>,
  options: { includeRelativeDate?: boolean } = {}
): ArticleInfo[] => {
  const badges = getSeriesBadges(articles);
  return articles.map(article => ({
    name: article.metadata.title,
    summary: article.metadata.summary,
    href: `/craft/${article.slug}` as Route<''>,
    publishedAt: formatDate({
      date: article.metadata.publishedAt,
      includeRelative: options.includeRelativeDate,
    }),
    ...(badges.has(article.slug) && { series: badges.get(article.slug) }),
  }));
};
