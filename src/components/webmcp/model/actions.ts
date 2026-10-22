import {
  hasShuffleDemo,
  runShuffleDemo,
  stopShuffleDemo,
} from '@/components/shuffle';
import {
  createToolDescriptor,
  emptyObjectSchema,
  webMCPSchemas,
} from '@/components/webmcp/lib/schemas';
import type { WebMCPContentIndexItem } from '@/components/webmcp/lib/content-index';
import {
  getCodeBlockText,
  getCurrentContentContext,
  getContentCapabilities,
  getSeriesTargetHref,
  jumpToHeading,
} from '@/components/webmcp/lib/content-snapshot';

type RouterLike = {
  push: (href: string) => void;
};

type ThemeValue = 'light' | 'dark' | 'system';

type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

type ToolFailure = {
  ok: false;
  error: string;
};

type WebMCPActionDeps = {
  pathname: string;
  router: RouterLike;
  getTheme: () => ThemeValue;
  setTheme: (theme: 'light' | 'dark') => void;
  getSoundEnabled: () => boolean;
  setSoundEnabled: (enabled: boolean) => void;
  getCurrentHref: () => string;
  document: Document;
  clipboard?: ClipboardLike;
  fetchContentIndex: () => Promise<WebMCPContentIndexItem[]>;
};

const destinations = {
  home: '/',
  article: '/article',
  craft: '/craft',
  'shuffle-playground': '/playground/shuffle-letters',
} as const;

function fail(error: string): ToolFailure {
  return { ok: false, error };
}
function readString(input: unknown, key: string) {
  return (input as Record<string, string>)[key];
}
function readNumber(input: unknown, key: string) {
  return (input as Record<string, number>)[key];
}
function readBoolean(input: unknown, key: string) {
  return (input as Record<string, boolean>)[key];
}

function includesText(item: WebMCPContentIndexItem, query: string) {
  const haystack = [
    item.title,
    item.summary,
    item.description,
    item.category,
    item.slug,
    item.series?.name ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function copyTextWithSelection(text: string, doc: Document) {
  if (!doc.body || typeof doc.execCommand !== 'function') {
    return false;
  }

  const textarea = doc.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  doc.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    return doc.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

async function writeClipboardText(
  text: string,
  {
    clipboard,
    document: doc,
  }: {
    clipboard?: ClipboardLike;
    document: Document;
  }
) {
  if (clipboard) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      return copyTextWithSelection(text, doc);
    }
  }

  return copyTextWithSelection(text, doc);
}

export function createLazyContentIndexFetcher(fetcher: typeof fetch = fetch) {
  let cached: Promise<WebMCPContentIndexItem[]> | undefined;

  return async () => {
    cached ??= fetcher('/api/webmcp/content-index')
      .then(response => {
        if (!response.ok) {
          throw new Error('WebMCP 콘텐츠 인덱스를 불러오지 못했습니다.');
        }

        return response.json();
      })
      .then((body: { items?: WebMCPContentIndexItem[] }) => body.items ?? [])
      .catch(error => {
        cached = undefined;
        throw error;
      });

    return cached;
  };
}

export function createWebMCPActions(deps: WebMCPActionDeps) {
  const handlers = {
    navigateSite(input: unknown) {
      const destination = readString(input, 'destination');
      const href = destinations[destination as keyof typeof destinations];

      deps.router.push(href);
      return { ok: true, href };
    },

    getSiteContext() {
      return {
        ok: true,
        pathname: deps.pathname,
        title: deps.document.title,
        canonicalUrl:
          deps.document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
            ?.href ?? deps.getCurrentHref(),
        actions: listActions(),
      };
    },

    toggleTheme() {
      const nextTheme = deps.getTheme() === 'dark' ? 'light' : 'dark';
      deps.setTheme(nextTheme);
      return { ok: true, theme: nextTheme };
    },

    setSound(input: unknown) {
      const enabled = readBoolean(input, 'enabled');

      deps.setSoundEnabled(enabled);
      return { ok: true, enabled };
    },

    async copyCurrentUrl() {
      const href = deps.getCurrentHref();

      if (
        !(await writeClipboardText(href, {
          clipboard: deps.clipboard,
          document: deps.document,
        }))
      ) {
        return fail('현재 URL을 클립보드에 복사하지 못했습니다.');
      }

      return { ok: true, href };
    },

    async findContent(input: unknown) {
      const query = readString(input, 'query');
      const type = readString(input, 'type');
      const limit = readNumber(input, 'limit');

      const items = await deps.fetchContentIndex();
      return {
        ok: true,
        items: items
          .filter(item => type === 'all' || item.type === type)
          .filter(item => includesText(item, query))
          .slice(0, limit),
      };
    },

    async openContent(input: unknown) {
      const type = readString(input, 'type');
      const slug = readString(input, 'slug');

      const items = await deps.fetchContentIndex();
      const target = items.find(
        item => item.type === type && item.slug === slug
      );

      if (!target) {
        return fail(`${type}/${slug} 콘텐츠를 찾지 못했습니다.`);
      }

      deps.router.push(target.href);
      return { ok: true, href: target.href };
    },

    getCurrentContentContext() {
      return getCurrentContentContext(deps.document);
    },

    openSeries(input: unknown) {
      const target = readString(input, 'target');

      const result = getSeriesTargetHref(
        target as 'series' | 'previous' | 'next',
        deps.document
      );

      if (!result.ok) {
        return result;
      }

      deps.router.push(result.href);
      return { ok: true, href: result.href };
    },

    jumpToHeading(input: unknown) {
      const headingId = readString(input, 'headingId');

      return jumpToHeading(headingId, deps.document);
    },

    async copyCodeBlock(input: unknown) {
      const index = readNumber(input, 'index');

      const result = getCodeBlockText(index, deps.document);

      if (!result.ok) {
        return result;
      }

      if (
        !(await writeClipboardText(result.text, {
          clipboard: deps.clipboard,
          document: deps.document,
        }))
      ) {
        return fail('코드 블록을 클립보드에 복사하지 못했습니다.');
      }

      return {
        ok: true,
        language: result.language,
        characterCount: result.characterCount,
      };
    },

    listPageActions() {
      return {
        ok: true,
        actions: listActions(),
      };
    },

    runShuffleLetters(input: unknown) {
      return runShuffleDemo(input, deps.document);
    },
    stopShuffleLetters() {
      return stopShuffleDemo(deps.document);
    },
  };
  function defineAction<Input, Output>(
    definition: Parameters<typeof createToolDescriptor<Input, Output>>[0] & {
      available?: () => boolean;
    }
  ) {
    return {
      tool: createToolDescriptor(definition),
      available: definition.available ?? (() => true),
    };
  }
  const definitions = [
    defineAction({
      name: 'navigate_site',
      description: 'Navigate to a safe internal page on bendd.me.',
      inputSchema: webMCPSchemas.navigateSite,
      execute: handlers.navigateSite,
    }),
    defineAction({
      name: 'get_site_context',
      description:
        'Read the current bendd.me route, title, canonical URL, and available actions.',
      inputSchema: emptyObjectSchema,
      annotations: { readOnlyHint: true },
      execute: handlers.getSiteContext,
    }),
    defineAction({
      name: 'toggle_theme',
      description: 'Toggle the visible site theme between light and dark.',
      inputSchema: emptyObjectSchema,
      execute: handlers.toggleTheme,
    }),
    defineAction({
      name: 'set_sound',
      description: 'Enable or disable site interaction sounds.',
      inputSchema: webMCPSchemas.setSound,
      execute: handlers.setSound,
    }),
    defineAction({
      name: 'copy_current_url',
      description: 'Copy the current page URL to the clipboard.',
      inputSchema: emptyObjectSchema,
      execute: handlers.copyCurrentUrl,
    }),
    defineAction({
      name: 'find_content',
      description:
        'Search bendd.me article and craft metadata by title, summary, description, category, slug, or series.',
      inputSchema: webMCPSchemas.findContent,
      annotations: { readOnlyHint: true },
      execute: handlers.findContent,
    }),
    defineAction({
      name: 'open_content',
      description: 'Open an internal article or craft page by type and slug.',
      inputSchema: webMCPSchemas.openContent,
      execute: handlers.openContent,
    }),
    defineAction({
      name: 'get_current_content_context',
      available: () => getContentCapabilities(deps.document).content,
      description:
        'Read the current article or craft title, metadata, TL;DR, headings, and a short excerpt.',
      inputSchema: emptyObjectSchema,
      annotations: { readOnlyHint: true },
      execute: handlers.getCurrentContentContext,
    }),
    defineAction({
      name: 'open_series',
      available: () => getContentCapabilities(deps.document).series,
      description:
        'Open the current series page, previous article, or next article when available.',
      inputSchema: webMCPSchemas.openSeries,
      execute: handlers.openSeries,
    }),
    defineAction({
      name: 'jump_to_heading',
      available: () => getContentCapabilities(deps.document).content,
      description:
        'Scroll the current article or craft page to a heading by id.',
      inputSchema: webMCPSchemas.jumpToHeading,
      execute: handlers.jumpToHeading,
    }),
    defineAction({
      name: 'copy_code_block',
      available: () => getContentCapabilities(deps.document).code,
      description: 'Copy a visible MDX code block by zero-based index.',
      inputSchema: webMCPSchemas.copyCodeBlock,
      execute: handlers.copyCodeBlock,
    }),
    defineAction({
      name: 'list_page_actions',
      description:
        'List the WebMCP actions that are meaningful on the current route.',
      inputSchema: emptyObjectSchema,
      annotations: { readOnlyHint: true },
      execute: handlers.listPageActions,
    }),
    defineAction({
      name: 'run_shuffle_letters',
      available: () => hasShuffleDemo(deps.document),
      description: 'Fill and run the ready Shuffle demo with visible values.',
      inputSchema: webMCPSchemas.runShuffleLetters,
      execute: handlers.runShuffleLetters,
    }),
    defineAction({
      name: 'stop_shuffle_letters',
      available: () => hasShuffleDemo(deps.document),
      description: 'Stop the running shuffle letters animation.',
      inputSchema: emptyObjectSchema,
      execute: handlers.stopShuffleLetters,
    }),
  ];

  function listActions(): string[] {
    return definitions
      .filter(action => action.available())
      .map(action => action.tool.name);
  }
  return {
    listActions,
    getTools: () =>
      definitions
        .filter(action => action.available())
        .map(action => action.tool),
  };
}
