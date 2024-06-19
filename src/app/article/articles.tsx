import Link from 'next/link';

import { WithSound } from '@/components/sound';
import { formatDate, getArticles } from './utils';

export function Articles() {
  const allArticles = getArticles();

  return (
    <>
      {allArticles
        .sort((a, b) => {
          if (
            new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)
          ) {
            return -1;
          }
          return 1;
        })
        .map(article => (
          <WithSound key={article.slug} assetPath="/sounds/page-turn.mp3">
            <Link
              key={article.slug}
              className="bd-relative -bd-m-3 bd-w-[calc(100%+32px)] bd-items-center bd-gap-3 bd-overflow-hidden bd-rounded-xl bd-p-3 bd-outline-none hover:bd-bg-secondary"
              href={`/article/${article.slug}`}
            >
              <div className="bd-flex bd-flex-col bd-gap-1 bd-overflow-hidden">
                <h2 className="bd-text-lg bd-font-bold bd-text-primary">
                  {article.metadata.title}
                </h2>
                <time className="bd-text-sm bd-tabular-nums bd-text-primary/60">
                  {formatDate(article.metadata.publishedAt, false)}
                </time>
              </div>
            </Link>
          </WithSound>
        ))}
    </>
  );
}
