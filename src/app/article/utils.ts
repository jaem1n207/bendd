import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const MetadataSchema = z.object({
  title: z.string(),
  publishedAt: z.string(),
  category: z.string(),
  summary: z.string().max(150),
  image: z.string().optional(),
});

type Metadata = z.infer<typeof MetadataSchema>;

function validateMetadata(metadata: Metadata): Metadata {
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
}

// credit: https://github.com/vercel/examples/blob/main/solutions/blog/app/blog/utils.ts
function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  let match = frontmatterRegex.exec(fileContent);
  if (!match) {
    throw new Error('MDX 파일에서 front matter를 찾지 못했어요.');
  }

  let frontMatterBlock = match![1];
  let content = fileContent.replace(frontmatterRegex, '').trim();
  let frontMatterLines = frontMatterBlock.trim().split('\n');
  let metadata: Partial<Metadata> = {};

  frontMatterLines.forEach(line => {
    let [key, ...valueArr] = line.split(': ');
    let value = valueArr.join(': ').trim();
    value = value.replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
    metadata[key.trim() as keyof Metadata] = value;
  });

  return { metadata: metadata as Metadata, content };
}

function getMDXFiles(dir: string): string[] {
  let files = fs.readdirSync(dir, { withFileTypes: true });
  let mdxFiles: string[] = [];

  files.forEach(file => {
    if (file.isDirectory()) {
      mdxFiles = [...mdxFiles, ...getMDXFiles(path.join(dir, file.name))];
    } else if (path.extname(file.name) === '.mdx') {
      mdxFiles.push(path.join(dir, file.name));
    }
  });

  return mdxFiles;
}

function readMDXFile(filePath: string) {
  let rawContent = fs.readFileSync(filePath, 'utf-8');
  let { metadata, content } = parseFrontmatter(rawContent);
  let validatedMetadata = validateMetadata(metadata);

  return { metadata: validatedMetadata, content };
}

function getMDXData(dir: string) {
  let mdxFiles = getMDXFiles(dir);
  return mdxFiles
    .map(file => {
      try {
        let { metadata, content } = readMDXFile(file);
        let slug = path.basename(file, path.extname(file));

        return {
          metadata,
          slug,
          content,
        };
      } catch (error) {
        throw new Error(`${file}을 처리하는 동안 오류가 발생했어요: ${error}`);
      }
    })
    .filter(Boolean);
}

export function getArticles() {
  return getMDXData(path.join(process.cwd(), 'content'));
}

export function formatDate(date: string, includeRelative = false) {
  let currentDate = new Date();
  if (!date.includes('T')) {
    date = `${date}T00:00:00`;
  }
  let targetDate = new Date(date);

  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth();
  let daysAgo = currentDate.getDate() - targetDate.getDate();

  let formattedDate = '';

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}년 전`;
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}개월 전`;
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}일 전`;
  } else {
    formattedDate = '오늘';
  }

  let fullDate = targetDate.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (!includeRelative) {
    return fullDate;
  }

  return `${fullDate} (${formattedDate})`;
}
