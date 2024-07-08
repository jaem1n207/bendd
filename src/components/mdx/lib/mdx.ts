import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { ArticleInfo } from '../../article/types/article';

const MetadataSchema = z.object({
  title: z.string().max(30),
  publishedAt: z.string(),
  category: z.string(),
  description: z.string().max(150),
  summary: z.string().max(40),
  image: z.string().optional(),
});

type Metadata = z.infer<typeof MetadataSchema>;
type Article = { metadata: Metadata; slug: string; content: string };

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

  const yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
  const monthsAgo = currentDate.getMonth() - targetDate.getMonth();
  const daysAgo = currentDate.getDate() - targetDate.getDate();

  const relativeDate =
    yearsAgo > 0
      ? `${yearsAgo}년 전`
      : monthsAgo > 0
        ? `${monthsAgo}개월 전`
        : daysAgo > 0
          ? `${daysAgo}일 전`
          : '오늘';

  const fullDate = targetDate.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

  return includeRelative ? `${fullDate} (${relativeDate})` : fullDate;
};

class MDXProcessor {
  private readonly articles: ReadonlyArray<Article>;
  private readonly operations: Array<
    (articles: ReadonlyArray<Article>) => ReadonlyArray<Article>
  >;

  private constructor(
    articles: ReadonlyArray<Article>,
    operations: Array<
      (articles: ReadonlyArray<Article>) => ReadonlyArray<Article>
    > = []
  ) {
    this.articles = articles;
    this.operations = operations;
  }

  static fromDirectory(dir: string): MDXProcessor {
    const mdxFiles = getMDXFiles(dir);
    const articles = mdxFiles.map(readMDXFile);
    return new MDXProcessor(articles);
  }

  private applyOperations(): ReadonlyArray<Article> {
    return this.operations.reduce(
      (articles, operation) => operation(articles),
      this.articles
    );
  }

  sortByDateDesc(): MDXProcessor {
    const sortOperation = (articles: ReadonlyArray<Article>) =>
      [...articles].sort(
        (a, b) =>
          new Date(b.metadata.publishedAt).getTime() -
          new Date(a.metadata.publishedAt).getTime()
      );
    return new MDXProcessor(this.articles, [...this.operations, sortOperation]);
  }

  sortByDateAsc(): MDXProcessor {
    const sortOperation = (articles: ReadonlyArray<Article>) =>
      [...articles].sort(
        (a, b) =>
          new Date(a.metadata.publishedAt).getTime() -
          new Date(b.metadata.publishedAt).getTime()
      );
    return new MDXProcessor(this.articles, [...this.operations, sortOperation]);
  }

  formatForDisplay(
    options: { includeSummary?: boolean; includeRelativeDate?: boolean } = {}
  ): ArticleInfo[] {
    return this.applyOperations().map(article => ({
      name: article.metadata.title,
      summary: article.metadata.summary,
      href: `/article/${article.slug}`,
      publishedAt: formatDate({
        date: article.metadata.publishedAt,
        includeRelative: options.includeRelativeDate,
      }),
      ...(options.includeSummary && { summary: article.metadata.summary }),
    }));
  }

  filterByCategory(category: string): MDXProcessor {
    const filterOperation = (articles: ReadonlyArray<Article>) =>
      articles.filter(article => article.metadata.category === category);
    return new MDXProcessor(this.articles, [
      ...this.operations,
      filterOperation,
    ]);
  }

  limit(count: number): MDXProcessor {
    const limitOperation = (articles: ReadonlyArray<Article>) =>
      articles.slice(0, count);
    return new MDXProcessor(this.articles, [
      ...this.operations,
      limitOperation,
    ]);
  }

  getArticles(): ReadonlyArray<Article> {
    return this.applyOperations();
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.applyOperations().find(article => article.slug === slug);
  }

  map<T>(fn: (article: Article) => T): T[] {
    return this.applyOperations().map(fn);
  }

  filter(predicate: (article: Article) => boolean): MDXProcessor {
    const filterOperation = (articles: ReadonlyArray<Article>) =>
      articles.filter(predicate);
    return new MDXProcessor(this.articles, [
      ...this.operations,
      filterOperation,
    ]);
  }
}

export const createMDXProcessor = (dir?: string) =>
  MDXProcessor.fromDirectory(dir ?? path.join(process.cwd(), 'content'));
