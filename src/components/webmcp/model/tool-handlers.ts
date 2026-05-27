import type { WebMCPContentIndexItem } from '@/components/webmcp/lib/content-index';
import {
  getCodeBlockText,
  getCurrentContentContext,
  getPageActions,
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

type WebMCPHandlerDeps = {
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
  dispatchWindowEvent: (name: string, detail?: unknown) => void;
};

const destinations = {
  home: '/',
  article: '/article',
  craft: '/craft',
  'shuffle-playground': '/playground/shuffle-letters',
} as const;
const shuffleLettersPathname = '/playground/shuffle-letters';

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

function fail(error: string): ToolFailure {
  return { ok: false, error };
}

function readString(input: unknown, key: string) {
  if (!isRecord(input) || typeof input[key] !== 'string') {
    return undefined;
  }

  return input[key];
}

function readNumber(input: unknown, key: string) {
  if (!isRecord(input) || typeof input[key] !== 'number') {
    return undefined;
  }

  return input[key];
}

function readBoolean(input: unknown, key: string) {
  if (!isRecord(input) || typeof input[key] !== 'boolean') {
    return undefined;
  }

  return input[key];
}

function isContentType(type: string): type is WebMCPContentIndexItem['type'] {
  return type === 'article' || type === 'craft';
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

function isShuffleLettersPathname(pathname: string) {
  return (
    pathname === shuffleLettersPathname ||
    pathname === `${shuffleLettersPathname}/`
  );
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
      .then((body: { items?: WebMCPContentIndexItem[] }) => body.items ?? []);

    return cached;
  };
}

export function createWebMCPHandlers(deps: WebMCPHandlerDeps) {
  return {
    navigateSite(input: unknown) {
      const destination = readString(input, 'destination');
      const href = destination
        ? destinations[destination as keyof typeof destinations]
        : undefined;

      if (!href) {
        return fail('지원하지 않는 destination입니다.');
      }

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
        actions: getPageActions(deps.pathname, deps.document),
      };
    },

    toggleTheme() {
      const nextTheme = deps.getTheme() === 'dark' ? 'light' : 'dark';
      deps.setTheme(nextTheme);
      return { ok: true, theme: nextTheme };
    },

    setSound(input: unknown) {
      const enabled = readBoolean(input, 'enabled');

      if (enabled == null) {
        return fail('enabled boolean 값이 필요합니다.');
      }

      deps.setSoundEnabled(enabled);
      return { ok: true, enabled };
    },

    async copyCurrentUrl() {
      const href = deps.getCurrentHref();

      if (!deps.clipboard) {
        return fail('클립보드 API를 사용할 수 없습니다.');
      }

      await deps.clipboard.writeText(href);
      return { ok: true, href };
    },

    async findContent(input: unknown) {
      const query = readString(input, 'query')?.trim();
      const type = readString(input, 'type') ?? 'all';
      const limit = readNumber(input, 'limit') ?? 5;

      if (!query) {
        return fail('query 문자열이 필요합니다.');
      }

      if (type !== 'all' && !isContentType(type)) {
        return fail('type은 all, article, craft 중 하나여야 합니다.');
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
        return fail('limit은 1에서 10 사이여야 합니다.');
      }

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

      if (!type || !isContentType(type)) {
        return fail('type은 article 또는 craft여야 합니다.');
      }

      if (!slug) {
        return fail('slug 문자열이 필요합니다.');
      }

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

      if (target !== 'series' && target !== 'previous' && target !== 'next') {
        return fail('target은 series, previous, next 중 하나여야 합니다.');
      }

      const result = getSeriesTargetHref(target, deps.document);

      if (!result.ok) {
        return result;
      }

      deps.router.push(result.href);
      return { ok: true, href: result.href };
    },

    jumpToHeading(input: unknown) {
      const headingId = readString(input, 'headingId');

      if (!headingId) {
        return fail('headingId 문자열이 필요합니다.');
      }

      return jumpToHeading(headingId, deps.document);
    },

    async copyCodeBlock(input: unknown) {
      const index = readNumber(input, 'index');

      if (index == null || !Number.isInteger(index) || index < 0) {
        return fail('index는 0 이상의 숫자여야 합니다.');
      }

      const result = getCodeBlockText(index, deps.document);

      if (!result.ok) {
        return result;
      }

      if (!deps.clipboard) {
        return fail('클립보드 API를 사용할 수 없습니다.');
      }

      await deps.clipboard.writeText(result.text);
      return {
        ok: true,
        language: result.language,
        characterCount: result.characterCount,
      };
    },

    listPageActions() {
      return {
        ok: true,
        actions: getPageActions(deps.pathname, deps.document),
      };
    },

    runShuffleLetters(input: unknown) {
      if (!isShuffleLettersPathname(deps.pathname)) {
        return fail('shuffle letters 페이지에서만 실행할 수 있습니다.');
      }

      const text = readString(input, 'text')?.trim();
      const iterations = readNumber(input, 'iterations');
      const fps = readNumber(input, 'fps');

      if (!text) {
        return fail('text 문자열이 필요합니다.');
      }

      if (
        iterations == null ||
        !Number.isInteger(iterations) ||
        iterations < 1 ||
        iterations > 50
      ) {
        return fail('iterations는 1에서 50 사이여야 합니다.');
      }

      if (fps == null || !Number.isInteger(fps) || fps < 1 || fps > 60) {
        return fail('fps는 1에서 60 사이여야 합니다.');
      }

      deps.dispatchWindowEvent('webmcp:run-shuffle-letters', {
        text,
        iterations,
        fps,
      });

      return { ok: true, text, iterations, fps };
    },

    stopShuffleLetters() {
      if (!isShuffleLettersPathname(deps.pathname)) {
        return fail('shuffle letters 페이지에서만 실행할 수 있습니다.');
      }

      deps.dispatchWindowEvent('webmcp:stop-shuffle-letters');
      return { ok: true };
    },
  };
}
