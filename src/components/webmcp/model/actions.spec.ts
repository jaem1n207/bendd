/* eslint-disable playwright/no-standalone-expect */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLazyContentIndexFetcher,
  createWebMCPActions,
} from '@/components/webmcp/model/actions';

import type { WebMCPContentIndexItem } from '@/components/webmcp/lib/content-index';

describe('createWebMCPActions', () => {
  const push = vi.fn();
  const setTheme = vi.fn();
  const setSoundEnabled = vi.fn();
  const writeText = vi.fn();

  const contentIndex = [
    {
      type: 'article',
      slug: 'agentic-interfaces',
      title: 'Agentic interfaces',
      summary: 'Agent UI notes',
      description: 'How agents use visible interfaces.',
      publishedAt: '2026-05-10',
      category: 'ai',
      href: '/article/agentic-interfaces',
      series: { id: 'ai-agents', name: 'AI Agents', order: 1 },
    },
    {
      type: 'craft',
      slug: 'shuffle-letters',
      title: 'Shuffle Letters',
      summary: 'Animated text playground',
      description: 'A craft note about animated letters.',
      publishedAt: '2026-05-11',
      category: 'playground',
      href: '/craft/shuffle-letters',
    },
  ] satisfies WebMCPContentIndexItem[];

  beforeEach(() => {
    vi.clearAllMocks();
    document.execCommand = vi.fn(() => false);
    document.head.innerHTML = `
      <title>Agentic interfaces</title>
      <link rel="canonical" href="https://bendd.me/article/agentic-interfaces">
    `;
    document.body.innerHTML = `
      <section
        data-webmcp-content
        data-webmcp-content-type="article"
        data-webmcp-slug="agentic-interfaces"
        data-webmcp-title="Agentic interfaces"
        data-webmcp-published-at="2026-05-10"
        data-webmcp-description="How agents use visible interfaces."
        data-webmcp-summary="Agent UI notes"
      >
        <a href="/article/series/ai-agents" data-webmcp-series-target="series">Series</a>
        <a href="/article/previous" data-webmcp-series-target="previous">Previous</a>
        <article>
          <p>First paragraph.</p>
          <h2 id="overview">Overview</h2>
          <pre data-webmcp-code-block><code class="language-ts">const value = 1;</code></pre>
        </article>
      </section>
    `;
  });

  function createHandlers() {
    const actions = createWebMCPActions({
      pathname: '/article/agentic-interfaces',
      router: { push },
      getTheme: () => 'dark',
      setTheme,
      getSoundEnabled: () => false,
      setSoundEnabled,
      getCurrentHref: () => 'https://bendd.me/article/agentic-interfaces',
      document,
      clipboard: { writeText },
      fetchContentIndex: async () => contentIndex,
    });
    return {
      getTools: actions.getTools,
      async execute(name: string, input: unknown = {}) {
        const tool = actions.getTools().find(tool => tool.name === name);
        if (!tool) {
          throw new Error(`Missing tool: ${name}`);
        }
        return tool.execute(input, {});
      },
    };
  }

  it('navigates only to known internal destinations', async () => {
    const handlers = createHandlers();

    expect(
      await handlers.execute('navigate_site', { destination: 'craft' })
    ).toEqual({
      ok: true,
      href: '/craft',
    });
    expect(push).toHaveBeenCalledWith('/craft');
    expect(
      await handlers.execute('navigate_site', { destination: 'external' })
    ).toEqual({
      ok: false,
      error: 'destination 값이 올바르지 않습니다.',
    });
  });

  it('returns site context from the current document', async () => {
    const handlers = createHandlers();

    expect(await handlers.execute('get_site_context')).toEqual({
      ok: true,
      pathname: '/article/agentic-interfaces',
      title: 'Agentic interfaces',
      canonicalUrl: 'https://bendd.me/article/agentic-interfaces',
      actions: expect.arrayContaining([
        'navigate_site',
        'get_site_context',
        'toggle_theme',
        'set_sound',
        'copy_current_url',
        'find_content',
        'open_content',
        'list_page_actions',
        'get_current_content_context',
        'jump_to_heading',
        'copy_code_block',
        'open_series',
      ]),
    });
  });

  it('toggles theme using the current resolved theme', async () => {
    const handlers = createHandlers();

    expect(await handlers.execute('toggle_theme')).toEqual({
      ok: true,
      theme: 'light',
    });
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('sets sound explicitly', async () => {
    const handlers = createHandlers();

    expect(await handlers.execute('set_sound', { enabled: true })).toEqual({
      ok: true,
      enabled: true,
    });
    expect(setSoundEnabled).toHaveBeenCalledWith(true);
    expect(await handlers.execute('set_sound', { enabled: 'yes' })).toEqual({
      ok: false,
      error: 'enabled 값이 올바르지 않습니다.',
    });
  });

  it('searches the lazy content index across content fields', async () => {
    const handlers = createHandlers();

    await expect(
      handlers.execute('find_content', {
        query: 'AI Agents',
        type: 'all',
        limit: 5,
      })
    ).resolves.toEqual({
      ok: true,
      items: [contentIndex[0]],
    });
    await expect(
      handlers.execute('find_content', {
        query: 'agent',
        type: 'video',
        limit: 5,
      })
    ).resolves.toEqual({
      ok: false,
      error: 'type 값이 올바르지 않습니다.',
    });
  });

  it('opens content found in the lazy content index', async () => {
    const handlers = createHandlers();

    await expect(
      handlers.execute('open_content', {
        type: 'article',
        slug: 'agentic-interfaces',
      })
    ).resolves.toEqual({
      ok: true,
      href: '/article/agentic-interfaces',
    });
    expect(push).toHaveBeenCalledWith('/article/agentic-interfaces');
    await expect(
      handlers.execute('open_content', { type: 'article', slug: 'missing' })
    ).resolves.toEqual({
      ok: false,
      error: 'article/missing 콘텐츠를 찾지 못했습니다.',
    });
  });

  it('delegates article helpers to snapshot utilities', async () => {
    const handlers = createHandlers();
    const heading = document.getElementById('overview') as HTMLElement;
    heading.scrollIntoView = vi.fn();

    expect(await handlers.execute('get_current_content_context')).toMatchObject(
      {
        ok: true,
        slug: 'agentic-interfaces',
      }
    );
    expect(await handlers.execute('open_series', { target: 'series' })).toEqual(
      {
        ok: true,
        href: '/article/series/ai-agents',
      }
    );
    expect(push).toHaveBeenCalledWith('/article/series/ai-agents');
    expect(
      await handlers.execute('jump_to_heading', { headingId: 'overview' })
    ).toEqual({
      ok: true,
      headingId: 'overview',
      title: 'Overview',
    });
  });

  it('copies current url and code block text through the clipboard dependency', async () => {
    const handlers = createHandlers();

    await expect(handlers.execute('copy_current_url')).resolves.toEqual({
      ok: true,
      href: 'https://bendd.me/article/agentic-interfaces',
    });
    await expect(
      handlers.execute('copy_code_block', { index: 0 })
    ).resolves.toEqual({
      ok: true,
      language: 'ts',
      characterCount: 16,
    });
    expect(writeText).toHaveBeenCalledWith(
      'https://bendd.me/article/agentic-interfaces'
    );
    expect(writeText).toHaveBeenCalledWith('const value = 1;');
    await expect(
      handlers.execute('copy_code_block', { index: -1 })
    ).resolves.toEqual({
      ok: false,
      error: 'index 값이 올바르지 않습니다.',
    });
  });

  it('returns structured failures when clipboard writes reject', async () => {
    const handlers = createHandlers();

    writeText.mockRejectedValueOnce(new DOMException('Denied'));
    await expect(handlers.execute('copy_current_url')).resolves.toEqual({
      ok: false,
      error: '현재 URL을 클립보드에 복사하지 못했습니다.',
    });

    writeText.mockRejectedValueOnce(new DOMException('Denied'));
    await expect(
      handlers.execute('copy_code_block', { index: 0 })
    ).resolves.toEqual({
      ok: false,
      error: '코드 블록을 클립보드에 복사하지 못했습니다.',
    });
  });

  it('falls back to selection copy when the async clipboard is denied', async () => {
    const handlers = createHandlers();

    writeText.mockRejectedValueOnce(new DOMException('Denied'));
    vi.mocked(document.execCommand).mockReturnValueOnce(true);

    await expect(handlers.execute('copy_current_url')).resolves.toEqual({
      ok: true,
      href: 'https://bendd.me/article/agentic-interfaces',
    });
    expect(document.execCommand).toHaveBeenCalledWith('copy');

    writeText.mockRejectedValueOnce(new DOMException('Denied'));
    vi.mocked(document.execCommand).mockReturnValueOnce(true);

    await expect(
      handlers.execute('copy_code_block', { index: 0 })
    ).resolves.toEqual({
      ok: true,
      language: 'ts',
      characterCount: 16,
    });
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns page actions for the current route', async () => {
    const handlers = createHandlers();

    expect(await handlers.execute('list_page_actions')).toEqual({
      ok: true,
      actions: expect.arrayContaining([
        'navigate_site',
        'get_site_context',
        'toggle_theme',
        'set_sound',
        'copy_current_url',
        'find_content',
        'open_content',
        'list_page_actions',
        'get_current_content_context',
        'jump_to_heading',
        'copy_code_block',
        'open_series',
      ]),
    });
  });

  it('omits shuffle when no ready demo exists', () => {
    const names = createHandlers()
      .getTools()
      .map(tool => tool.name);
    expect(names).not.toContain('run_shuffle_letters');
    expect(names).not.toContain('stop_shuffle_letters');
  });
});

describe('createLazyContentIndexFetcher', () => {
  it('fetches the index once and reuses the in-memory promise', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [{ slug: 'one' }] }),
    })) as unknown as typeof fetch;

    const load = createLazyContentIndexFetcher(fetcher);

    await expect(load()).resolves.toEqual([{ slug: 'one' }]);
    await expect(load()).resolves.toEqual([{ slug: 'one' }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/webmcp/content-index');
  });

  it('propagates a Korean error when the response fails', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      json: async () => ({ items: [] }),
    })) as unknown as typeof fetch;

    const load = createLazyContentIndexFetcher(fetcher);

    await expect(load()).rejects.toThrow(
      'WebMCP 콘텐츠 인덱스를 불러오지 못했습니다.'
    );
  });

  it('clears a failed fetch so a later call can retry', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ items: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      }) as unknown as typeof fetch;
    const load = createLazyContentIndexFetcher(fetcher);

    await expect(load()).rejects.toThrow(
      'WebMCP 콘텐츠 인덱스를 불러오지 못했습니다.'
    );
    await expect(load()).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
