import { createMDXProcessor } from '@/mdx/mdx';
import { ArticleItem } from './article-item';

export function ArticleList() {
  const processor = createMDXProcessor();
  const formattedArticleInfo = processor.sortByDateDesc().formatForDisplay({
    includeRelativeDate: false,
  });

  return (
    <div className="relative mx-auto my-0 mt-8 max-w-4xl space-y-1 overflow-y-auto overflow-x-hidden px-2 pb-28 pt-10 sm:px-6 sm:py-32">
      {formattedArticleInfo.map((article, index) => (
        <ArticleItem key={article.href} {...article} index={index} />
      ))}
    </div>
  );
}
