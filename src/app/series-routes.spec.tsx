import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Article } from '@/mdx/mdx';
import ArticleSeries, {
  generateMetadata as articleMetadata,
  generateStaticParams as articleParams,
} from '@/app/article/series/[id]/page';
import CraftSeries, {
  generateMetadata as craftMetadata,
  generateStaticParams as craftParams,
} from '@/app/craft/series/[id]/page';
import ArticlePage from '@/app/article/[slug]/page';
import CraftPage from '@/app/craft/[slug]/page';

const source = vi.hoisted(() => ({
  readError: undefined as Error | undefined,
  articles: [] as Article[],
  crafts: [] as Article[],
}));
vi.mock('@/mdx/mdx', async importOriginal => ({
  ...(await importOriginal<typeof import('@/mdx/mdx')>()),
  readArticles: () => {
    if (source.readError) {
      throw source.readError;
    }
    return source.articles;
  },
  readCraftArticles: () => {
    if (source.readError) {
      throw source.readError;
    }
    return source.crafts;
  },
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/components/layout/mdx', () => ({ MdxLayout: () => null }));

function article(series: string): Article {
  return {
    slug: 'entry',
    content: '',
    metadata: {
      title: 'Entry',
      summary: 'Summary',
      description: 'Description',
      category: 'test',
      publishedAt: '2026-10-22',
      series,
      seriesOrder: 1,
    },
  };
}

beforeEach(() => {
  source.readError = undefined;
  source.articles = [];
  source.crafts = [];
});
describe.each([
  {
    kind: 'article',
    id: 'ai-coding-agent',
    wrong: 'synchronize-tab-scrolling',
    metadata: articleMetadata,
    params: articleParams,
    page: ArticleSeries,
    detail: ArticlePage,
  },
  {
    kind: 'craft',
    id: 'synchronize-tab-scrolling',
    wrong: 'ai-coding-agent',
    metadata: craftMetadata,
    params: craftParams,
    page: CraftSeries,
    detail: CraftPage,
  },
])(
  '$kind series route behavior',
  ({ kind, id, wrong, metadata, params, page, detail }) => {
    it('keeps registered empty series in static params and metadata but returns 404 for its body', async () => {
      expect(params()).toContainEqual({ id });
      const result = await metadata({ params: Promise.resolve({ id }) });
      expect(result.alternates?.canonical).toBe(
        `https://bendd.me/${kind}/series/${id}`
      );
      expect(result.openGraph).toMatchObject({
        url: `https://bendd.me/${kind}/series/${id}`,
        type: 'website',
      });
      await expect(page({ params: Promise.resolve({ id }) })).rejects.toThrow(
        'NOT_FOUND'
      );
    });
    it.each(['unknown', 'wrong'])(
      'rejects %s series for metadata and body',
      async name => {
        const query = name === 'wrong' ? wrong : 'missing';
        await expect(
          metadata({ params: Promise.resolve({ id: query }) })
        ).rejects.toThrow('NOT_FOUND');
        await expect(
          page({ params: Promise.resolve({ id: query }) })
        ).rejects.toThrow('NOT_FOUND');
      }
    );
    it.each(['missing', 'wrong'])(
      'returns 404 for %s even when content loading would fail',
      async name => {
        source.readError = new Error('CONTENT_LOAD_FAILED');
        await expect(
          page({
            params: Promise.resolve({
              id: name === 'wrong' ? wrong : 'missing',
            }),
          })
        ).rejects.toThrow('NOT_FOUND');
      }
    );
    it('renders a populated series using its content kind', async () => {
      source.articles = source.crafts = [article(id)];
      const result = await page({ params: Promise.resolve({ id }) });
      expect(result.type).toBe('main');
    });
    it.each(['missing', 'wrong'])(
      'omits navigation without hiding a detail article with %s series',
      async name => {
        source.articles = source.crafts = [
          article(name === 'wrong' ? wrong : 'missing'),
        ];
        const result = await detail({
          params: Promise.resolve({ slug: 'entry' }),
        });
        expect(result.props.seriesInfo).toBeUndefined();
        expect(result.props.post.slug).toBe('entry');
      }
    );
  }
);
