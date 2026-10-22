import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { type Route } from 'next';

import type { ArticleInfo } from '@/components/article/types/article';
import { getSeriesBadges } from '@/lib/series';

const MetadataSchema = z
  .object({
    title: z.string().max(38),
    publishedAt: z.string(),
    category: z.string(),
    description: z.string().max(150),
    summary: z.string().max(40),
    image: z.string().optional(),
    video: z
      .string()
      .regex(
        /^\/(?:[\w-]+\/)*[\w-]+\.(?:mp4|webm)$/,
        'video는 public 안의 MP4 또는 WebM 파일 경로여야 합니다.'
      )
      .optional(),
    videoWidth: z.coerce.number().int().positive().optional(),
    videoHeight: z.coerce.number().int().positive().optional(),
    series: z.string().optional(),
    seriesOrder: z.coerce.number().int().positive().optional(),
  })
  .refine(
    data =>
      data.video
        ? data.videoWidth != null && data.videoHeight != null
        : data.videoWidth == null && data.videoHeight == null,
    {
      message: 'video, videoWidth, videoHeight는 함께 설정해야 합니다.',
      path: ['video'],
    }
  )
  .refine(data => !data.series || data.seriesOrder != null, {
    message: 'series가 설정된 글에는 seriesOrder가 필수입니다.',
    path: ['seriesOrder'],
  });

type Metadata = z.infer<typeof MetadataSchema>;
export type Article = { metadata: Metadata; slug: string; content: string };

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
