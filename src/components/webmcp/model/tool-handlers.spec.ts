/* eslint-disable playwright/no-standalone-expect */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLazyContentIndexFetcher,
  createWebMCPHandlers,
} from '@/components/webmcp/model/tool-handlers';

import type { WebMCPContentIndexItem } from '@/components/webmcp/lib/content-index';

describe('createWebMCPHandlers', () => {
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
    return createWebMCPHandlers({
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
      dispatchWindowEvent: vi.fn(),
    });
  }

  it('navigates only to known internal destinations', () => {
    const handlers = createHandlers();

    expect(handlers.navigateSite({ destination: 'craft' })).toEqual({
      ok: true,
      href: '/craft',
    });
    expect(push).toHaveBeenCalledWith('/craft');
    expect(handlers.navigateSite({ destination: 'external' })).toEqual({
      ok: false,
      error: '지원하지 않는 destination입니다.',
    });
  });

  it('returns site context from the current document', () => {
    const handlers = createHandlers();

    expect(handlers.getSiteContext()).toEqual({
      ok: true,
      pathname: '/article/agentic-interfaces',
      title: 'Agentic interfaces',
      canonicalUrl: 'https://bendd.me/article/agentic-interfaces',
      actions: [
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
      ],
    });
  });

  it('toggles theme using the current resolved theme', () => {
    const handlers = createHandlers();

    expect(handlers.toggleTheme()).toEqual({
      ok: true,
      theme: 'light',
    });
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('sets sound explicitly', () => {
    const handlers = createHandlers();

    expect(handlers.setSound({ enabled: true })).toEqual({
      ok: true,
      enabled: true,
    });
    expect(setSoundEnabled).toHaveBeenCalledWith(true);
    expect(handlers.setSound({ enabled: 'yes' })).toEqual({
      ok: false,
      error: 'enabled boolean 값이 필요합니다.',
    });
  });

  it('searches the lazy content index across content fields', async () => {
    const handlers = createHandlers();

    await expect(
      handlers.findContent({ query: 'AI Agents', type: 'all', limit: 5 })
    ).resolves.toEqual({
      ok: true,
      items: [contentIndex[0]],
    });
    await expect(
      handlers.findContent({ query: 'agent', type: 'video', limit: 5 })
    ).resolves.toEqual({
      ok: false,
      error: 'type은 all, article, craft 중 하나여야 합니다.',
    });
  });

  it('opens content found in the lazy content index', async () => {
    const handlers = createHandlers();

    await expect(
      handlers.openContent({ type: 'article', slug: 'agentic-interfaces' })
    ).resolves.toEqual({
      ok: true,
      href: '/article/agentic-interfaces',
    });
    expect(push).toHaveBeenCalledWith('/article/agentic-interfaces');
    await expect(
      handlers.openContent({ type: 'article', slug: 'missing' })
    ).resolves.toEqual({
      ok: false,
      error: 'article/missing 콘텐츠를 찾지 못했습니다.',
    });
  });

  it('delegates article helpers to snapshot utilities', () => {
    const handlers = createHandlers();
    const heading = document.getElementById('overview') as HTMLElement;
    heading.scrollIntoView = vi.fn();

    expect(handlers.getCurrentContentContext()).toMatchObject({
      ok: true,
      slug: 'agentic-interfaces',
    });
    expect(handlers.openSeries({ target: 'series' })).toEqual({
      ok: true,
      href: '/article/series/ai-agents',
    });
    expect(push).toHaveBeenCalledWith('/article/series/ai-agents');
    expect(handlers.jumpToHeading({ headingId: 'overview' })).toEqual({
      ok: true,
      headingId: 'overview',
      title: 'Overview',
    });
  });

  it('copies current url and code block text through the clipboard dependency', async () => {
    const handlers = createHandlers();

    await expect(handlers.copyCurrentUrl()).resolves.toEqual({
      ok: true,
      href: 'https://bendd.me/article/agentic-interfaces',
    });
    await expect(handlers.copyCodeBlock({ index: 0 })).resolves.toEqual({
      ok: true,
      language: 'ts',
      characterCount: 16,
    });
    expect(writeText).toHaveBeenCalledWith(
      'https://bendd.me/article/agentic-interfaces'
    );
    expect(writeText).toHaveBeenCalledWith('const value = 1;');
    await expect(handlers.copyCodeBlock({ index: -1 })).resolves.toEqual({
      ok: false,
      error: 'index는 0 이상의 숫자여야 합니다.',
    });
  });

  it('returns page actions for the current route', () => {
    const handlers = createHandlers();

    expect(handlers.listPageActions()).toEqual({
      ok: true,
      actions: [
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
      ],
    });
  });

  it('dispatches shuffle events after validating bounds', () => {
    const dispatchWindowEvent = vi.fn();
    const handlers = createWebMCPHandlers({
      pathname: '/playground/shuffle-letters',
      router: { push },
      getTheme: () => 'light',
      setTheme,
      getSoundEnabled: () => false,
      setSoundEnabled,
      getCurrentHref: () => 'https://bendd.me/playground/shuffle-letters',
      document,
      clipboard: { writeText },
      fetchContentIndex: async () => [],
      dispatchWindowEvent,
    });

    expect(
      handlers.runShuffleLetters({ text: 'Hello', iterations: 8, fps: 30 })
    ).toEqual({
      ok: true,
      text: 'Hello',
      iterations: 8,
      fps: 30,
    });
    expect(dispatchWindowEvent).toHaveBeenCalledWith(
      'webmcp:run-shuffle-letters',
      { text: 'Hello', iterations: 8, fps: 30 }
    );
    expect(
      handlers.runShuffleLetters({ text: 'Hello', iterations: 99, fps: 30 })
    ).toEqual({
      ok: false,
      error: 'iterations는 1에서 50 사이여야 합니다.',
    });

    expect(handlers.stopShuffleLetters()).toEqual({ ok: true });
    expect(dispatchWindowEvent).toHaveBeenCalledWith(
      'webmcp:stop-shuffle-letters'
    );
  });

  it('rejects runShuffleLetters outside the shuffle playground without dispatching', () => {
    const dispatchWindowEvent = vi.fn();
    const handlers = createWebMCPHandlers({
      pathname: '/article/agentic-interfaces',
      router: { push },
      getTheme: () => 'light',
      setTheme,
      getSoundEnabled: () => false,
      setSoundEnabled,
      getCurrentHref: () => 'https://bendd.me/article/agentic-interfaces',
      document,
      clipboard: { writeText },
      fetchContentIndex: async () => [],
      dispatchWindowEvent,
    });

    expect(
      handlers.runShuffleLetters({ text: 'Hello', iterations: 8, fps: 30 })
    ).toEqual({
      ok: false,
      error: 'shuffle letters 페이지에서만 실행할 수 있습니다.',
    });
    expect(dispatchWindowEvent).not.toHaveBeenCalled();
  });

  it('rejects stopShuffleLetters outside the shuffle playground without dispatching', () => {
    const dispatchWindowEvent = vi.fn();
    const handlers = createWebMCPHandlers({
      pathname: '/article/agentic-interfaces',
      router: { push },
      getTheme: () => 'light',
      setTheme,
      getSoundEnabled: () => false,
      setSoundEnabled,
      getCurrentHref: () => 'https://bendd.me/article/agentic-interfaces',
      document,
      clipboard: { writeText },
      fetchContentIndex: async () => [],
      dispatchWindowEvent,
    });

    expect(handlers.stopShuffleLetters()).toEqual({
      ok: false,
      error: 'shuffle letters 페이지에서만 실행할 수 있습니다.',
    });
    expect(dispatchWindowEvent).not.toHaveBeenCalled();
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
});
