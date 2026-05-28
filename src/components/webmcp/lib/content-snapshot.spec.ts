/* eslint-disable playwright/no-standalone-expect */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCodeBlockText,
  getCurrentContentContext,
  getPageActions,
  getSeriesTargetHref,
  jumpToHeading,
} from '@/components/webmcp/lib/content-snapshot';

describe('content-snapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <section
          data-webmcp-content
          data-webmcp-content-type="article"
          data-webmcp-slug="agentic-interfaces"
          data-webmcp-title="Agentic interfaces"
          data-webmcp-published-at="2026-05-10"
          data-webmcp-description="How agents use visible interfaces."
          data-webmcp-summary="Agent UI notes"
          data-webmcp-series-id="ai-agents"
          data-webmcp-series-name="AI Agents"
        >
          <blockquote><p><strong>TL;DR</strong>: Visible tools help agents.</p></blockquote>
          <a href="/article/series/ai-agents" data-webmcp-series-target="series">Series</a>
          <a href="/article/previous" data-webmcp-series-target="previous">Previous</a>
          <article>
            <p>First paragraph that becomes a short excerpt for agent context.</p>
            <h2 id="overview">Overview</h2>
            <h3 id="usage">Usage</h3>
            <h4 id="details">Details</h4>
            <pre data-webmcp-code-block><code>const value = 1;</code></pre>
          </article>
        </section>
      </main>
    `;
  });

  it('extracts current content context without full body text', () => {
    expect(getCurrentContentContext(document)).toEqual({
      ok: true,
      type: 'article',
      slug: 'agentic-interfaces',
      title: 'Agentic interfaces',
      publishedAt: '2026-05-10',
      description: 'How agents use visible interfaces.',
      summary: 'Agent UI notes',
      series: {
        id: 'ai-agents',
        name: 'AI Agents',
      },
      tldr: 'TL;DR: Visible tools help agents.',
      excerpt:
        'First paragraph that becomes a short excerpt for agent context.',
      headings: [
        { id: 'overview', title: 'Overview', level: 2 },
        { id: 'usage', title: 'Usage', level: 3 },
        { id: 'details', title: 'Details', level: 4 },
      ],
    });
  });

  it('returns a structured miss when no content marker exists', () => {
    document.body.innerHTML = '<main><p>Home page</p></main>';

    expect(getCurrentContentContext(document)).toEqual({
      ok: false,
      error: '현재 페이지에는 WebMCP 콘텐츠 컨텍스트가 없습니다.',
    });
  });

  it('returns a structured failure when required content metadata is invalid', () => {
    document.body.innerHTML = `
      <section
        data-webmcp-content
        data-webmcp-content-type="page"
        data-webmcp-slug=""
        data-webmcp-title=""
      >
        <article><p>Invalid metadata.</p></article>
      </section>
    `;

    expect(getCurrentContentContext(document)).toEqual({
      ok: false,
      error: 'WebMCP 콘텐츠 메타데이터가 올바르지 않습니다.',
    });
  });

  it('reads code block text by zero-based index', () => {
    expect(getCodeBlockText(0, document)).toEqual({
      ok: true,
      language: '',
      text: 'const value = 1;',
      characterCount: 16,
    });
    expect(getCodeBlockText(1, document)).toEqual({
      ok: false,
      error: '1번 코드 블록을 찾지 못했습니다.',
    });
  });

  it('scrolls to a heading by id', () => {
    const heading = document.getElementById('overview') as HTMLElement;
    heading.scrollIntoView = vi.fn();

    expect(jumpToHeading('overview', document)).toEqual({
      ok: true,
      headingId: 'overview',
      title: 'Overview',
    });
    expect(heading.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    const h3 = document.getElementById('usage') as HTMLElement;
    h3.scrollIntoView = vi.fn();

    expect(jumpToHeading('usage', document)).toEqual({
      ok: true,
      headingId: 'usage',
      title: 'Usage',
    });
    expect(h3.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('rejects headings outside the marked content article', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<h2 id="outside">Outside heading</h2>'
    );
    const outsideHeading = document.getElementById('outside') as HTMLElement;
    outsideHeading.scrollIntoView = vi.fn();

    expect(jumpToHeading('outside', document)).toEqual({
      ok: false,
      error: 'outside heading을 찾지 못했습니다.',
    });
    expect(outsideHeading.scrollIntoView).not.toHaveBeenCalled();
  });

  it('finds series target hrefs from marked links', () => {
    expect(getSeriesTargetHref('series', document)).toEqual({
      ok: true,
      href: '/article/series/ai-agents',
    });
    expect(getSeriesTargetHref('next', document)).toEqual({
      ok: false,
      error: 'next 시리즈 이동 링크를 찾지 못했습니다.',
    });
  });

  it('rejects marked series links without hrefs', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<a data-webmcp-series-target="next">Next</a>'
    );

    expect(getSeriesTargetHref('next', document)).toEqual({
      ok: false,
      error: 'next 시리즈 이동 링크에 href가 없습니다.',
    });
  });

  it('lists route-relevant page actions', () => {
    expect(getPageActions('/article/agentic-interfaces', document)).toEqual([
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
    ]);
  });

  it('lists shuffle actions only on the exact shuffle playground route', () => {
    expect(getPageActions('/playground/shuffle-letters', document)).toContain(
      'run_shuffle_letters'
    );
    expect(getPageActions('/playground/shuffle-letters', document)).toContain(
      'stop_shuffle_letters'
    );
    expect(getPageActions('/playground/shuffle-letters/', document)).toContain(
      'run_shuffle_letters'
    );
    expect(
      getPageActions('/playground/shuffle-letters-preview', document)
    ).not.toContain('run_shuffle_letters');
    expect(
      getPageActions('/playground/shuffle-letters-preview', document)
    ).not.toContain('stop_shuffle_letters');
  });
});
