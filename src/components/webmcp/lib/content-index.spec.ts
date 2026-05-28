/* eslint-disable playwright/no-standalone-expect */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebMCPContentIndex } from '@/components/webmcp/lib/content-index';
import {
  getSeriesBadges,
  readArticles,
  readCraftArticles,
  sortByDateDesc,
  type Article,
} from '@/mdx/mdx';

vi.mock('@/mdx/mdx', () => ({
  getSeriesBadges: vi.fn(),
  readArticles: vi.fn(),
  readCraftArticles: vi.fn(),
  sortByDateDesc: vi.fn((articles: ReadonlyArray<Article>) => articles),
}));

const article: Article = {
  slug: 'agentic-interfaces',
  content: 'FULL ARTICLE BODY MUST NOT LEAK',
  metadata: {
    title: 'Agentic Interfaces',
    summary: 'Interfaces for agents',
    description: 'A practical note about interfaces for agent workflows.',
    publishedAt: '2026-05-20',
    category: 'AI',
    series: 'ai-interfaces',
    seriesOrder: 2,
  },
};

const craft: Article = {
  slug: 'interaction-sketch',
  content: 'FULL CRAFT BODY MUST NOT LEAK',
  metadata: {
    title: 'Interaction Sketch',
    summary: 'A small craft piece',
    description: 'A craft note about interaction details.',
    publishedAt: '2026-05-21',
    category: 'Craft',
  },
};

describe('createWebMCPContentIndex', () => {
  beforeEach(() => {
    vi.mocked(readArticles).mockReturnValue([article]);
    vi.mocked(readCraftArticles).mockReturnValue([craft]);
    vi.mocked(sortByDateDesc).mockImplementation(
      (articles: ReadonlyArray<Article>) => articles
    );
    vi.mocked(getSeriesBadges).mockReturnValue(
      new Map([
        [
          'agentic-interfaces',
          { id: 'ai-interfaces', name: 'AI Interfaces', order: 2, total: 3 },
        ],
      ])
    );
  });

  it('returns article and craft metadata without leaking MDX content bodies', () => {
    const items = createWebMCPContentIndex();

    expect(items).toEqual([
      {
        type: 'article',
        slug: 'agentic-interfaces',
        title: 'Agentic Interfaces',
        summary: 'Interfaces for agents',
        description: 'A practical note about interfaces for agent workflows.',
        publishedAt: '2026-05-20',
        category: 'AI',
        href: '/article/agentic-interfaces',
        series: { id: 'ai-interfaces', name: 'AI Interfaces', order: 2 },
      },
      {
        type: 'craft',
        slug: 'interaction-sketch',
        title: 'Interaction Sketch',
        summary: 'A small craft piece',
        description: 'A craft note about interaction details.',
        publishedAt: '2026-05-21',
        category: 'Craft',
        href: '/craft/interaction-sketch',
      },
    ]);
    expect(JSON.stringify(items)).not.toContain(
      'FULL ARTICLE BODY MUST NOT LEAK'
    );
    expect(JSON.stringify(items)).not.toContain(
      'FULL CRAFT BODY MUST NOT LEAK'
    );
    expect(sortByDateDesc).toHaveBeenCalledWith([article]);
    expect(sortByDateDesc).toHaveBeenCalledWith([craft]);
    expect(getSeriesBadges).toHaveBeenCalledWith([article]);
  });
});
