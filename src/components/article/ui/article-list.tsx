import { createMDXProcessor } from '@/mdx/mdx';
import { ArticleItem } from './article-item';

export function ArticleList() {
  const processor = createMDXProcessor();
  const formattedArticleInfo = processor.sortByDateDesc().formatForDisplay({
    includeRelativeDate: false,
  });

  return (
    <div className="bd-relative bd-mx-auto bd-my-0 bd-mt-8 bd-max-w-4xl bd-space-y-1 bd-overflow-y-auto bd-overflow-x-hidden bd-px-2 bd-pb-28 bd-pt-10 sm:bd-px-6 sm:bd-py-32">
      {formattedArticleInfo.map((article, index) => (
        <ArticleItem key={article.href} {...article} index={index} />
      ))}
    </div>
  );
}
