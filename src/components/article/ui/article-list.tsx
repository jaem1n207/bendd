import { cn } from '@/lib/utils';
import { ArticleItem } from './article-item';
import { createMDXProcessor } from '@/mdx/mdx';

export function ArticleList({ className }: { className?: string }) {
  const processor = createMDXProcessor();
  const formattedArticleInfo = processor.sortByDateDesc().formatForDisplay({
    includeRelativeDate: false,
  });

  return (
    <div className={cn('bd-flex bd-flex-col bd-gap-7 bd-group', className)}>
      {formattedArticleInfo.map((article, index) => (
        <ArticleItem key={article.href} {...article} index={index} />
      ))}
    </div>
  );
}
