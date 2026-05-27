/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/webmcp/content-index/route';
import { createWebMCPContentIndex } from '@/components/webmcp/lib/content-index';

vi.mock('@/components/webmcp/lib/content-index', () => ({
  createWebMCPContentIndex: vi.fn(() => [
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
  ]),
}));

describe('GET /api/webmcp/content-index', () => {
  it('returns the content index with cache headers', async () => {
    const response = GET();

    await expect(response.json()).resolves.toEqual({
      items: [
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
      ],
    });
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=3600'
    );
    expect(createWebMCPContentIndex).toHaveBeenCalledOnce();
  });
});
