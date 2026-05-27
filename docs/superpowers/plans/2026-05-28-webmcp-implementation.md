# WebMCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-safe WebMCP support across bendd.me so AI agents can use structured tools for navigation, content discovery, document actions, settings, and the shuffle letters playground.

**Architecture:** WebMCP is a progressive enhancement mounted by a client-only provider under `src/components/webmcp/`. The provider feature-detects `navigator.modelContext`, registers only route-relevant tools during idle time, and unregisters with `AbortController` on route changes. Content search uses a lazy `/api/webmcp/content-index` endpoint so unsupported browsers do not pay the cost of building a content index.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Vitest + jsdom, Zustand, next-themes, WebMCP Imperative API, WebMCP Declarative API.

---

## Scope Check

The approved spec covers four visible product surfaces: global navigation/settings, article/craft content, MDX document actions, and shuffle playground interaction. They share one WebMCP provider, one registration helper, and one route-aware tool layer, so this can remain a single implementation plan. The work is split into focused commits so each part is testable and reversible.

## File Structure

- Create `src/components/webmcp/types/webmcp.d.ts`: local type declarations for the experimental browser API.
- Create `src/components/webmcp/lib/schemas.ts`: JSON Schema constants and tool descriptor helper.
- Create `src/components/webmcp/lib/register-tool.ts`: feature detection and `AbortController`-based registration helper.
- Create `src/components/webmcp/lib/register-tool.spec.ts`: registration helper unit tests.
- Create `src/components/webmcp/index.ts`: public barrel export after the provider exists.
- Create `src/components/webmcp/lib/content-index.ts`: server-safe content index builder without MDX body text.
- Create `src/components/webmcp/lib/content-index.spec.ts`: content index unit tests.
- Create `src/app/api/webmcp/content-index/route.ts`: lazy content index route.
- Create `src/app/api/webmcp/content-index/route.spec.ts`: route response unit tests.
- Create `src/components/webmcp/lib/content-snapshot.ts`: DOM snapshot utilities for current document, headings, code blocks, and series links.
- Create `src/components/webmcp/lib/content-snapshot.spec.ts`: DOM snapshot unit tests.
- Modify `src/components/layout/mdx.tsx`: add stable `data-webmcp-*` attributes for content metadata.
- Modify `src/components/series/ui/series-navigation-top.tsx`: mark series link for `open_series`.
- Modify `src/components/series/ui/series-navigation-bottom.tsx`: mark series, previous, and next links for `open_series`.
- Modify `src/mdx/components/pre/pre.tsx`: mark code blocks for `copy_code_block`.
- Create `src/components/webmcp/model/tool-handlers.ts`: route-independent tool handler factory.
- Create `src/components/webmcp/model/tool-handlers.spec.ts`: handler unit tests with mock DOM/router/clipboard.
- Create `src/components/webmcp/model/use-webmcp-tools.ts`: React hook that binds handlers to router/theme/sound state and returns route-relevant descriptors.
- Create `src/components/webmcp/ui/webmcp-provider.tsx`: idle registration lifecycle.
- Create `src/components/webmcp/ui/webmcp-provider.spec.tsx`: provider lifecycle tests.
- Modify `src/app/layout.tsx`: dynamically mount `WebMCPProvider` with `ssr: false`.
- Modify `src/components/sound/model/sound-store.ts`: add explicit `setSoundEnabled` action used by `set_sound`.
- Modify `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.tsx`: add declarative WebMCP annotations and custom-event execution.
- Modify `src/app/playground/shuffle-letters/page.tsx`: add declarative annotations and custom-event execution on the standalone playground.
- Create `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx`: test WebMCP event execution and form annotations.
- Modify `src/globals.css`: add HSL-based `:tool-form-active` and `:tool-submit-active` focus styles.
- Modify `next.config.mjs`: add `tools=(self)` to `Permissions-Policy`.
- Modify `docs/architecture.md`: document WebMCP architecture and performance contract.
- Modify `docs/conventions.md`: document WebMCP implementation rules.

## Task 1: WebMCP Types, Schemas, and Registration Helper

**Files:**

- Create: `src/components/webmcp/types/webmcp.d.ts`
- Create: `src/components/webmcp/lib/schemas.ts`
- Create: `src/components/webmcp/lib/register-tool.ts`
- Create: `src/components/webmcp/lib/register-tool.spec.ts`

- [ ] **Step 1: Write the failing registration tests**

Create `src/components/webmcp/lib/register-tool.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { hasModelContext, registerWebMCPTools } from './register-tool';
import type { WebMCPToolDescriptor } from '../types/webmcp';

function createTool(name: string): WebMCPToolDescriptor {
  return {
    name,
    description: `${name} description`,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: vi.fn(),
  };
}

describe('registerWebMCPTools', () => {
  it('returns false when navigator.modelContext is missing', () => {
    expect(hasModelContext({} as Navigator)).toBe(false);
  });

  it('returns true when navigator.modelContext.registerTool exists', () => {
    expect(
      hasModelContext({
        modelContext: {
          registerTool: vi.fn(),
        },
      } as unknown as Navigator)
    ).toBe(true);
  });

  it('registers each tool with one abort signal and cleans up by aborting it', () => {
    const registerTool = vi.fn();
    const navigatorMock = {
      modelContext: { registerTool },
    } as unknown as Navigator;
    const tools = [createTool('get_site_context'), createTool('navigate_site')];

    const cleanup = registerWebMCPTools(tools, navigatorMock);

    expect(registerTool).toHaveBeenCalledTimes(2);
    const firstOptions = registerTool.mock.calls[0][1] as {
      signal: AbortSignal;
    };
    const secondOptions = registerTool.mock.calls[1][1] as {
      signal: AbortSignal;
    };
    expect(firstOptions.signal).toBe(secondOptions.signal);
    expect(firstOptions.signal.aborted).toBe(false);

    cleanup();

    expect(firstOptions.signal.aborted).toBe(true);
  });

  it('does nothing and returns a stable cleanup function when unsupported', () => {
    const cleanup = registerWebMCPTools([createTool('get_site_context')], {
      modelContext: undefined,
    } as unknown as Navigator);

    expect(() => cleanup()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/register-tool.spec.ts
```

Expected: FAIL because `src/components/webmcp/lib/register-tool.ts` does not exist.

- [ ] **Step 3: Add the experimental WebMCP types**

Create `src/components/webmcp/types/webmcp.d.ts`:

```ts
export type WebMCPJSONSchema = {
  type: string;
  properties?: Record<string, WebMCPJSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: readonly string[];
  const?: string | number | boolean;
  title?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  anyOf?: readonly WebMCPJSONSchema[];
};

export type WebMCPToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type WebMCPToolDescriptor<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: WebMCPJSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (input: Input) => Output | Promise<Output>;
};

export type WebMCPRegisterOptions = {
  signal?: AbortSignal;
};

export type WebMCPModelContext = {
  registerTool: (
    tool: WebMCPToolDescriptor,
    options?: WebMCPRegisterOptions
  ) => void;
};

declare global {
  interface Navigator {
    modelContext?: WebMCPModelContext;
  }
}

declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: boolean | '';
  }

  interface HTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
```

- [ ] **Step 4: Add schema constants**

Create `src/components/webmcp/lib/schemas.ts`:

```ts
import type {
  WebMCPJSONSchema,
  WebMCPToolAnnotations,
  WebMCPToolDescriptor,
} from '@/components/webmcp/types/webmcp';

export type WebMCPToolName =
  | 'navigate_site'
  | 'get_site_context'
  | 'toggle_theme'
  | 'set_sound'
  | 'copy_current_url'
  | 'find_content'
  | 'open_content'
  | 'get_current_content_context'
  | 'open_series'
  | 'jump_to_heading'
  | 'copy_code_block'
  | 'list_page_actions'
  | 'run_shuffle_letters'
  | 'stop_shuffle_letters';

export const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} satisfies WebMCPJSONSchema;

const stringSchema = {
  type: 'string',
} satisfies WebMCPJSONSchema;

const numberSchema = (minimum: number, maximum: number) =>
  ({
    type: 'number',
    minimum,
    maximum,
  }) satisfies WebMCPJSONSchema;

const enumSchema = (values: readonly string[]) =>
  ({
    type: 'string',
    enum: values,
  }) satisfies WebMCPJSONSchema;

export const webMCPSchemas = {
  navigateSite: {
    type: 'object',
    properties: {
      destination: enumSchema([
        'home',
        'article',
        'craft',
        'shuffle-playground',
      ]),
    },
    required: ['destination'],
    additionalProperties: false,
  },
  setSound: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
    },
    required: ['enabled'],
    additionalProperties: false,
  },
  findContent: {
    type: 'object',
    properties: {
      query: stringSchema,
      type: enumSchema(['all', 'article', 'craft']),
      limit: numberSchema(1, 10),
    },
    required: ['query'],
    additionalProperties: false,
  },
  openContent: {
    type: 'object',
    properties: {
      type: enumSchema(['article', 'craft']),
      slug: stringSchema,
    },
    required: ['type', 'slug'],
    additionalProperties: false,
  },
  openSeries: {
    type: 'object',
    properties: {
      target: enumSchema(['series', 'previous', 'next']),
    },
    required: ['target'],
    additionalProperties: false,
  },
  jumpToHeading: {
    type: 'object',
    properties: {
      headingId: stringSchema,
    },
    required: ['headingId'],
    additionalProperties: false,
  },
  copyCodeBlock: {
    type: 'object',
    properties: {
      index: numberSchema(0, 999),
    },
    required: ['index'],
    additionalProperties: false,
  },
  runShuffleLetters: {
    type: 'object',
    properties: {
      text: stringSchema,
      iterations: numberSchema(1, 50),
      fps: numberSchema(1, 60),
    },
    required: ['text', 'iterations', 'fps'],
    additionalProperties: false,
  },
} satisfies Record<string, WebMCPJSONSchema>;

export function createToolDescriptor<Input, Output>({
  name,
  description,
  inputSchema,
  annotations,
  execute,
}: {
  name: WebMCPToolName;
  description: string;
  inputSchema: WebMCPJSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (input: Input) => Output | Promise<Output>;
}): WebMCPToolDescriptor<Input, Output> {
  return {
    name,
    description,
    inputSchema,
    annotations,
    execute,
  };
}
```

- [ ] **Step 5: Add the registration helper**

Create `src/components/webmcp/lib/register-tool.ts`:

```ts
import type { WebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const noop = () => {};

export function hasModelContext(
  navigatorLike: Navigator | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator
): navigatorLike is Navigator & {
  modelContext: NonNullable<Navigator['modelContext']>;
} {
  return typeof navigatorLike?.modelContext?.registerTool === 'function';
}

export function registerWebMCPTools(
  tools: readonly WebMCPToolDescriptor[],
  navigatorLike: Navigator | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator
) {
  if (!hasModelContext(navigatorLike)) {
    return noop;
  }

  const controller = new AbortController();

  for (const tool of tools) {
    navigatorLike.modelContext.registerTool(tool, {
      signal: controller.signal,
    });
  }

  return () => {
    controller.abort();
  };
}
```

- [ ] **Step 6: Run the registration tests**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/register-tool.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/components/webmcp/types/webmcp.d.ts src/components/webmcp/lib/schemas.ts src/components/webmcp/lib/register-tool.ts src/components/webmcp/lib/register-tool.spec.ts
git commit -m "feat(webmcp): 도구 등록 기반 구조 추가"
```

## Task 2: Lazy Content Index API

**Files:**

- Create: `src/components/webmcp/lib/content-index.ts`
- Create: `src/components/webmcp/lib/content-index.spec.ts`
- Create: `src/app/api/webmcp/content-index/route.ts`
- Create: `src/app/api/webmcp/content-index/route.spec.ts`

- [ ] **Step 1: Write failing content index tests**

Create `src/components/webmcp/lib/content-index.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/mdx/mdx', () => ({
  readArticles: () => [
    {
      slug: 'agentic-interfaces',
      metadata: {
        title: 'Agentic interfaces',
        summary: 'Agent UI notes',
        description: 'How agents use visible interfaces.',
        publishedAt: '2026-05-10',
        category: 'ai',
        series: 'ai-agents',
        seriesOrder: 2,
      },
      content: 'FULL ARTICLE BODY MUST NOT LEAK',
    },
  ],
  readCraftArticles: () => [
    {
      slug: 'shuffle-demo',
      metadata: {
        title: 'Shuffle demo',
        summary: 'Motion demo',
        description: 'A small animation experiment.',
        publishedAt: '2026-04-01',
        category: 'motion',
      },
      content: 'FULL CRAFT BODY MUST NOT LEAK',
    },
  ],
  sortByDateDesc: <T>(items: readonly T[]) => [...items],
  getSeriesBadges: () =>
    new Map([
      [
        'agentic-interfaces',
        {
          id: 'ai-agents',
          name: 'AI Agents',
          order: 2,
          total: 3,
        },
      ],
    ]),
}));

import { createWebMCPContentIndex } from './content-index';

describe('createWebMCPContentIndex', () => {
  it('returns article and craft metadata without MDX body content', () => {
    const items = createWebMCPContentIndex();

    expect(items).toEqual([
      {
        type: 'article',
        slug: 'agentic-interfaces',
        title: 'Agentic interfaces',
        summary: 'Agent UI notes',
        description: 'How agents use visible interfaces.',
        publishedAt: '2026-05-10',
        category: 'ai',
        href: '/article/agentic-interfaces',
        series: {
          id: 'ai-agents',
          name: 'AI Agents',
          order: 2,
        },
      },
      {
        type: 'craft',
        slug: 'shuffle-demo',
        title: 'Shuffle demo',
        summary: 'Motion demo',
        description: 'A small animation experiment.',
        publishedAt: '2026-04-01',
        category: 'motion',
        href: '/craft/shuffle-demo',
      },
    ]);
    expect(JSON.stringify(items)).not.toContain('FULL ARTICLE BODY');
    expect(JSON.stringify(items)).not.toContain('FULL CRAFT BODY');
  });
});
```

- [ ] **Step 2: Run the failing content index test**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-index.spec.ts
```

Expected: FAIL because `content-index.ts` does not exist.

- [ ] **Step 3: Implement the content index builder**

Create `src/components/webmcp/lib/content-index.ts`:

```ts
import {
  getSeriesBadges,
  readArticles,
  readCraftArticles,
  sortByDateDesc,
} from '@/mdx/mdx';

export type WebMCPContentIndexItem = {
  type: 'article' | 'craft';
  slug: string;
  title: string;
  summary: string;
  description: string;
  publishedAt: string;
  category: string;
  href: string;
  series?: {
    id: string;
    name: string;
    order: number;
  };
};

export function createWebMCPContentIndex(): WebMCPContentIndexItem[] {
  const articles = sortByDateDesc(readArticles());
  const crafts = sortByDateDesc(readCraftArticles());
  const articleBadges = getSeriesBadges(articles);

  const articleItems = articles.map(article => {
    const series = articleBadges.get(article.slug);

    return {
      type: 'article' as const,
      slug: article.slug,
      title: article.metadata.title,
      summary: article.metadata.summary,
      description: article.metadata.description,
      publishedAt: article.metadata.publishedAt,
      category: article.metadata.category,
      href: `/article/${article.slug}`,
      ...(series && {
        series: {
          id: series.id,
          name: series.name,
          order: series.order,
        },
      }),
    };
  });

  const craftItems = crafts.map(craft => ({
    type: 'craft' as const,
    slug: craft.slug,
    title: craft.metadata.title,
    summary: craft.metadata.summary,
    description: craft.metadata.description,
    publishedAt: craft.metadata.publishedAt,
    category: craft.metadata.category,
    href: `/craft/${craft.slug}`,
  }));

  return [...articleItems, ...craftItems];
}
```

- [ ] **Step 4: Run the content index test**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-index.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing route tests**

Create `src/app/api/webmcp/content-index/route.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/webmcp/lib/content-index', () => ({
  createWebMCPContentIndex: () => [
    {
      type: 'article',
      slug: 'agentic-interfaces',
      title: 'Agentic interfaces',
      summary: 'Agent UI notes',
      description: 'How agents use visible interfaces.',
      publishedAt: '2026-05-10',
      category: 'ai',
      href: '/article/agentic-interfaces',
    },
  ],
}));

import { GET } from './route';

describe('/api/webmcp/content-index', () => {
  it('returns a small JSON content index with cache headers', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=3600'
    );
    expect(body).toEqual({
      items: [
        {
          type: 'article',
          slug: 'agentic-interfaces',
          title: 'Agentic interfaces',
          summary: 'Agent UI notes',
          description: 'How agents use visible interfaces.',
          publishedAt: '2026-05-10',
          category: 'ai',
          href: '/article/agentic-interfaces',
        },
      ],
    });
  });
});
```

- [ ] **Step 6: Run the failing route test**

Run:

```bash
pnpm test:unit src/app/api/webmcp/content-index/route.spec.ts
```

Expected: FAIL because `route.ts` does not exist.

- [ ] **Step 7: Implement the content index route**

Create `src/app/api/webmcp/content-index/route.ts`:

```ts
import { createWebMCPContentIndex } from '@/components/webmcp/lib/content-index';

export const dynamic = 'force-static';

export async function GET() {
  return Response.json(
    {
      items: createWebMCPContentIndex(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    }
  );
}
```

- [ ] **Step 8: Run the route and content index tests**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-index.spec.ts src/app/api/webmcp/content-index/route.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/components/webmcp/lib/content-index.ts src/components/webmcp/lib/content-index.spec.ts src/app/api/webmcp/content-index/route.ts src/app/api/webmcp/content-index/route.spec.ts
git commit -m "feat(webmcp): 콘텐츠 인덱스 API 추가"
```

## Task 3: DOM Snapshot Utilities and Stable Page Markers

**Files:**

- Create: `src/components/webmcp/lib/content-snapshot.ts`
- Create: `src/components/webmcp/lib/content-snapshot.spec.ts`
- Modify: `src/components/layout/mdx.tsx`
- Modify: `src/components/series/ui/series-navigation-top.tsx`
- Modify: `src/components/series/ui/series-navigation-bottom.tsx`
- Modify: `src/mdx/components/pre/pre.tsx`

- [ ] **Step 1: Write failing snapshot tests**

Create `src/components/webmcp/lib/content-snapshot.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCodeBlockText,
  getCurrentContentContext,
  getPageActions,
  getSeriesTargetHref,
  jumpToHeading,
} from './content-snapshot';

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
});
```

- [ ] **Step 2: Run the failing snapshot test**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-snapshot.spec.ts
```

Expected: FAIL because `content-snapshot.ts` does not exist.

- [ ] **Step 3: Implement the snapshot utilities**

Create `src/components/webmcp/lib/content-snapshot.ts`:

```ts
import type { WebMCPToolName } from '@/components/webmcp/lib/schemas';

type ContentType = 'article' | 'craft';
type SeriesTarget = 'series' | 'previous' | 'next';

type HeadingSnapshot = {
  id: string;
  title: string;
  level: 2 | 4;
};

type SnapshotFailure = {
  ok: false;
  error: string;
};

const contentSelector = '[data-webmcp-content]';
const codeBlockSelector = 'pre[data-webmcp-code-block]';

const baseActions: WebMCPToolName[] = [
  'navigate_site',
  'get_site_context',
  'toggle_theme',
  'set_sound',
  'copy_current_url',
  'find_content',
  'open_content',
  'list_page_actions',
];

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function getDocument(doc: Document | undefined) {
  return doc ?? document;
}

function getContentRoot(doc: Document) {
  return doc.querySelector<HTMLElement>(contentSelector);
}

export function getCurrentContentContext(docLike?: Document) {
  const doc = getDocument(docLike);
  const root = getContentRoot(doc);

  if (!root) {
    return {
      ok: false,
      error: '현재 페이지에는 WebMCP 콘텐츠 컨텍스트가 없습니다.',
    } satisfies SnapshotFailure;
  }

  const article = root.querySelector('article');
  const headings = [
    ...root.querySelectorAll<HTMLElement>('article h2[id], article h4[id]'),
  ]
    .map(heading => ({
      id: heading.id,
      title: cleanText(heading.textContent),
      level: Number(heading.tagName.slice(1)) as 2 | 4,
    }))
    .filter((heading): heading is HeadingSnapshot =>
      Boolean(heading.id && heading.title)
    );
  const excerpt = cleanText(article?.querySelector('p')?.textContent).slice(
    0,
    300
  );
  const seriesId = root.dataset.webmcpSeriesId;
  const seriesName = root.dataset.webmcpSeriesName;

  return {
    ok: true,
    type: root.dataset.webmcpContentType as ContentType,
    slug: root.dataset.webmcpSlug ?? '',
    title: root.dataset.webmcpTitle ?? '',
    publishedAt: root.dataset.webmcpPublishedAt ?? '',
    description: root.dataset.webmcpDescription ?? '',
    summary: root.dataset.webmcpSummary ?? '',
    ...(seriesId &&
      seriesName && {
        series: {
          id: seriesId,
          name: seriesName,
        },
      }),
    tldr: cleanText(root.querySelector('blockquote')?.textContent),
    excerpt,
    headings,
  };
}

export function getCodeBlockText(index: number, docLike?: Document) {
  const doc = getDocument(docLike);
  const block = [...doc.querySelectorAll<HTMLElement>(codeBlockSelector)][
    index
  ];
  const code = block?.querySelector('code');
  const text = code?.textContent?.trim() ?? '';

  if (!block || !text) {
    return {
      ok: false,
      error: `${index}번 코드 블록을 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  const languageClass = [...(code?.classList ?? [])].find(className =>
    className.startsWith('language-')
  );

  return {
    ok: true,
    language: languageClass?.replace('language-', '') ?? '',
    text,
    characterCount: text.length,
  };
}

export function jumpToHeading(headingId: string, docLike?: Document) {
  const doc = getDocument(docLike);
  const heading = doc.getElementById(headingId);

  if (!heading) {
    return {
      ok: false,
      error: `${headingId} heading을 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return {
    ok: true,
    headingId,
    title: cleanText(heading.textContent),
  };
}

export function getSeriesTargetHref(target: SeriesTarget, docLike?: Document) {
  const doc = getDocument(docLike);
  const link = doc.querySelector<HTMLAnchorElement>(
    `[data-webmcp-series-target="${target}"]`
  );

  if (!link) {
    return {
      ok: false,
      error: `${target} 시리즈 이동 링크를 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  return {
    ok: true,
    href: link.getAttribute('href') ?? '',
  };
}

export function getPageActions(pathname: string, docLike?: Document) {
  const doc = getDocument(docLike);
  const actions = new Set<WebMCPToolName>(baseActions);

  if (getContentRoot(doc)) {
    actions.add('get_current_content_context');
    actions.add('jump_to_heading');
  }

  if (doc.querySelector(codeBlockSelector)) {
    actions.add('copy_code_block');
  }

  if (doc.querySelector('[data-webmcp-series-target]')) {
    actions.add('open_series');
  }

  if (pathname.startsWith('/playground/shuffle-letters')) {
    actions.add('run_shuffle_letters');
    actions.add('stop_shuffle_letters');
  }

  return [...actions];
}
```

- [ ] **Step 4: Run the snapshot test**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-snapshot.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Add content metadata markers to the MDX layout**

Modify `src/components/layout/mdx.tsx`. Replace:

```tsx
<section id="BenddDoc">
```

with:

```tsx
<section
  id="BenddDoc"
  data-webmcp-content
  data-webmcp-content-type={type}
  data-webmcp-slug={post.slug}
  data-webmcp-title={title}
  data-webmcp-published-at={publishedAt}
  data-webmcp-description={description}
  data-webmcp-summary={summary}
  data-webmcp-series-id={seriesInfo?.id}
  data-webmcp-series-name={seriesInfo?.name}
>
```

- [ ] **Step 6: Mark series navigation links**

Modify `src/components/series/ui/series-navigation-top.tsx`. Add `data-webmcp-series-target="series"` to the series link:

```tsx
<Link
  href={seriesRoute(id)}
  data-webmcp-series-target="series"
  className="mb-4 flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
>
```

Modify `src/components/series/ui/series-navigation-bottom.tsx`. Add `data-webmcp-series-target="series"` to the top series link:

```tsx
<Link
  href={seriesRoute(id)}
  data-webmcp-series-target="series"
  className="mb-4 flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
>
```

In the previous link, add:

```tsx
data-webmcp-series-target="previous"
```

In the next link, add:

```tsx
data-webmcp-series-target="next"
```

- [ ] **Step 7: Mark MDX code blocks**

Modify `src/mdx/components/pre/pre.tsx`. Add `data-webmcp-code-block` to the `<pre>` element:

```tsx
<pre
  ref={preRef}
  data-webmcp-code-block
  className={cn(
    'my-0 overflow-x-auto rounded-lg border border-solid border-border px-0 py-3',
    'contrast-more:border-current contrast-more:dark:border-current'
  )}
  {...props}
  tabIndex={-1}
  translate="no"
>
```

- [ ] **Step 8: Run related tests**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/content-snapshot.spec.ts src/components/series/test/series-navigation-top.spec.tsx src/components/series/test/series-navigation-bottom.spec.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/components/webmcp/lib/content-snapshot.ts src/components/webmcp/lib/content-snapshot.spec.ts src/components/layout/mdx.tsx src/components/series/ui/series-navigation-top.tsx src/components/series/ui/series-navigation-bottom.tsx src/mdx/components/pre/pre.tsx
git commit -m "feat(webmcp): 문서 스냅샷 마커 추가"
```

## Task 4: Tool Handlers

**Files:**

- Create: `src/components/webmcp/model/tool-handlers.ts`
- Create: `src/components/webmcp/model/tool-handlers.spec.ts`
- Modify: `src/components/sound/model/sound-store.ts`

- [ ] **Step 1: Write failing handler tests**

Create `src/components/webmcp/model/tool-handlers.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLazyContentIndexFetcher,
  createWebMCPHandlers,
} from './tool-handlers';

describe('createWebMCPHandlers', () => {
  const push = vi.fn();
  const setTheme = vi.fn();
  const setSoundEnabled = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
        <article>
          <p>First paragraph.</p>
          <h2 id="overview">Overview</h2>
          <pre data-webmcp-code-block><code>const value = 1;</code></pre>
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
      fetchContentIndex: async () => [
        {
          type: 'article',
          slug: 'agentic-interfaces',
          title: 'Agentic interfaces',
          summary: 'Agent UI notes',
          description: 'How agents use visible interfaces.',
          publishedAt: '2026-05-10',
          category: 'ai',
          href: '/article/agentic-interfaces',
        },
      ],
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
  });

  it('searches the lazy content index', async () => {
    const handlers = createHandlers();

    await expect(
      handlers.findContent({ query: 'agent', type: 'all', limit: 5 })
    ).resolves.toEqual({
      ok: true,
      items: [
        {
          type: 'article',
          slug: 'agentic-interfaces',
          title: 'Agentic interfaces',
          summary: 'Agent UI notes',
          description: 'How agents use visible interfaces.',
          publishedAt: '2026-05-10',
          category: 'ai',
          href: '/article/agentic-interfaces',
        },
      ],
    });
  });

  it('copies code block text through the clipboard dependency', async () => {
    const handlers = createHandlers();

    await expect(handlers.copyCodeBlock({ index: 0 })).resolves.toEqual({
      ok: true,
      language: '',
      characterCount: 16,
    });
    expect(writeText).toHaveBeenCalledWith('const value = 1;');
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
  });
});
```

- [ ] **Step 2: Run the failing handler test**

Run:

```bash
pnpm test:unit src/components/webmcp/model/tool-handlers.spec.ts
```

Expected: FAIL because `tool-handlers.ts` does not exist.

- [ ] **Step 3: Add explicit sound setter**

Modify `src/components/sound/model/sound-store.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SoundState = {
  isSoundEnabled: boolean;
  toggleSoundEnabled: () => void;
  setSoundEnabled: (enabled: boolean) => void;
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isSoundEnabled: false,
      toggleSoundEnabled: () => {
        set({ isSoundEnabled: !get().isSoundEnabled });
      },
      setSoundEnabled: enabled => {
        set({ isSoundEnabled: enabled });
      },
    }),
    {
      name: 'sound-enabled',
    }
  )
);
```

- [ ] **Step 4: Implement the handler factory**

Create `src/components/webmcp/model/tool-handlers.ts`:

```ts
import {
  getCodeBlockText,
  getCurrentContentContext,
  getPageActions,
  getSeriesTargetHref,
  jumpToHeading,
} from '@/components/webmcp/lib/content-snapshot';
import type { WebMCPContentIndexItem } from '@/components/webmcp/lib/content-index';

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

      if (!['all', 'article', 'craft'].includes(type)) {
        return fail('type은 all, article, craft 중 하나여야 합니다.');
      }

      if (limit < 1 || limit > 10) {
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

      if (type !== 'article' && type !== 'craft') {
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

      if (index == null || index < 0) {
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
      const text = readString(input, 'text')?.trim();
      const iterations = readNumber(input, 'iterations');
      const fps = readNumber(input, 'fps');

      if (!text) {
        return fail('text 문자열이 필요합니다.');
      }

      if (iterations == null || iterations < 1 || iterations > 50) {
        return fail('iterations는 1에서 50 사이여야 합니다.');
      }

      if (fps == null || fps < 1 || fps > 60) {
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
      deps.dispatchWindowEvent('webmcp:stop-shuffle-letters');
      return { ok: true };
    },
  };
}
```

- [ ] **Step 5: Run handler tests**

Run:

```bash
pnpm test:unit src/components/webmcp/model/tool-handlers.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Run sound switcher test**

Run:

```bash
pnpm test:unit src/components/sound/ui/sound-switcher.spec.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/components/webmcp/model/tool-handlers.ts src/components/webmcp/model/tool-handlers.spec.ts src/components/sound/model/sound-store.ts
git commit -m "feat(webmcp): 에이전트 도구 핸들러 추가"
```

## Task 5: Provider Lifecycle and Root Layout Integration

**Files:**

- Create: `src/components/webmcp/model/use-webmcp-tools.ts`
- Create: `src/components/webmcp/ui/webmcp-provider.tsx`
- Create: `src/components/webmcp/ui/webmcp-provider.spec.tsx`
- Create: `src/components/webmcp/index.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write failing provider lifecycle tests**

Create `src/components/webmcp/ui/webmcp-provider.spec.tsx`:

```tsx
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/webmcp/model/use-webmcp-tools', () => ({
  useWebMCPTools: () => [
    {
      name: 'get_site_context',
      description: 'Read site context.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: vi.fn(),
    },
  ],
}));

import { WebMCPProvider } from './webmcp-provider';

describe('WebMCPProvider', () => {
  let originalNavigatorDescriptor: PropertyDescriptor | undefined;
  let originalRequestIdleCallback: typeof globalThis.requestIdleCallback;
  let originalCancelIdleCallback: typeof globalThis.cancelIdleCallback;

  beforeEach(() => {
    originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'navigator'
    );
    originalRequestIdleCallback = globalThis.requestIdleCallback;
    originalCancelIdleCallback = globalThis.cancelIdleCallback;
  });

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis,
        'navigator',
        originalNavigatorDescriptor
      );
    }
    globalThis.requestIdleCallback = originalRequestIdleCallback;
    globalThis.cancelIdleCallback = originalCancelIdleCallback;
    vi.clearAllMocks();
  });

  it('does not schedule idle work when WebMCP is unsupported', () => {
    const idle = vi.fn();
    globalThis.requestIdleCallback = idle as typeof requestIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    render(<WebMCPProvider />);

    expect(idle).not.toHaveBeenCalled();
  });

  it('registers tools during idle time and aborts on unmount', () => {
    const registerTool = vi.fn();
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }) as typeof requestIdleCallback;
    globalThis.cancelIdleCallback = vi.fn() as typeof cancelIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        modelContext: { registerTool },
      },
    });

    const { unmount } = render(<WebMCPProvider />);

    expect(registerTool).not.toHaveBeenCalled();
    idleCallbacks[0]({} as IdleDeadline);
    expect(registerTool).toHaveBeenCalledTimes(1);

    const signal = registerTool.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing provider test**

Run:

```bash
pnpm test:unit src/components/webmcp/ui/webmcp-provider.spec.tsx
```

Expected: FAIL because `webmcp-provider.tsx` does not exist.

- [ ] **Step 3: Implement the WebMCP tool hook**

Create `src/components/webmcp/model/use-webmcp-tools.ts`:

```ts
'use client';

import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import {
  emptyObjectSchema,
  createToolDescriptor,
  webMCPSchemas,
} from '@/components/webmcp/lib/schemas';
import {
  createLazyContentIndexFetcher,
  createWebMCPHandlers,
} from '@/components/webmcp/model/tool-handlers';
import { useSoundStore } from '@/components/sound';

const fetchContentIndex = createLazyContentIndexFetcher();

export function useWebMCPTools() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const setSoundEnabled = useSoundStore(state => state.setSoundEnabled);

  return useMemo(() => {
    const handlers = createWebMCPHandlers({
      pathname,
      router,
      getTheme: () => (resolvedTheme === 'dark' ? 'dark' : 'light'),
      setTheme,
      getSoundEnabled: () => isSoundEnabled,
      setSoundEnabled,
      getCurrentHref: () => window.location.href,
      document,
      clipboard: navigator.clipboard,
      fetchContentIndex,
      dispatchWindowEvent: (name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      },
    });

    const tools = [
      createToolDescriptor({
        name: 'navigate_site',
        description: 'Navigate to a safe internal page on bendd.me.',
        inputSchema: webMCPSchemas.navigateSite,
        execute: handlers.navigateSite,
      }),
      createToolDescriptor({
        name: 'get_site_context',
        description:
          'Read the current bendd.me route, title, canonical URL, and available actions.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.getSiteContext,
      }),
      createToolDescriptor({
        name: 'toggle_theme',
        description: 'Toggle the visible site theme between light and dark.',
        inputSchema: emptyObjectSchema,
        execute: handlers.toggleTheme,
      }),
      createToolDescriptor({
        name: 'set_sound',
        description: 'Enable or disable site interaction sounds.',
        inputSchema: webMCPSchemas.setSound,
        execute: handlers.setSound,
      }),
      createToolDescriptor({
        name: 'copy_current_url',
        description: 'Copy the current page URL to the clipboard.',
        inputSchema: emptyObjectSchema,
        execute: handlers.copyCurrentUrl,
      }),
      createToolDescriptor({
        name: 'find_content',
        description:
          'Search bendd.me article and craft metadata by title, summary, description, category, slug, or series.',
        inputSchema: webMCPSchemas.findContent,
        annotations: { readOnlyHint: true },
        execute: handlers.findContent,
      }),
      createToolDescriptor({
        name: 'open_content',
        description: 'Open an internal article or craft page by type and slug.',
        inputSchema: webMCPSchemas.openContent,
        execute: handlers.openContent,
      }),
      createToolDescriptor({
        name: 'get_current_content_context',
        description:
          'Read the current article or craft title, metadata, TL;DR, headings, and a short excerpt.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.getCurrentContentContext,
      }),
      createToolDescriptor({
        name: 'open_series',
        description:
          'Open the current series page, previous article, or next article when available.',
        inputSchema: webMCPSchemas.openSeries,
        execute: handlers.openSeries,
      }),
      createToolDescriptor({
        name: 'jump_to_heading',
        description:
          'Scroll the current article or craft page to a heading by id.',
        inputSchema: webMCPSchemas.jumpToHeading,
        execute: handlers.jumpToHeading,
      }),
      createToolDescriptor({
        name: 'copy_code_block',
        description: 'Copy a visible MDX code block by zero-based index.',
        inputSchema: webMCPSchemas.copyCodeBlock,
        execute: handlers.copyCodeBlock,
      }),
      createToolDescriptor({
        name: 'list_page_actions',
        description:
          'List the WebMCP actions that are meaningful on the current route.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.listPageActions,
      }),
      createToolDescriptor({
        name: 'run_shuffle_letters',
        description:
          'Fill and run the shuffle letters playground with visible values.',
        inputSchema: webMCPSchemas.runShuffleLetters,
        execute: handlers.runShuffleLetters,
      }),
      createToolDescriptor({
        name: 'stop_shuffle_letters',
        description: 'Stop the running shuffle letters animation.',
        inputSchema: emptyObjectSchema,
        execute: handlers.stopShuffleLetters,
      }),
    ];

    const available = new Set(handlers.listPageActions().actions);
    return tools.filter(tool => available.has(tool.name));
  }, [
    isSoundEnabled,
    pathname,
    resolvedTheme,
    router,
    setSoundEnabled,
    setTheme,
  ]);
}
```

- [ ] **Step 4: Implement the provider**

Create `src/components/webmcp/ui/webmcp-provider.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

import {
  hasModelContext,
  registerWebMCPTools,
} from '@/components/webmcp/lib/register-tool';
import { useWebMCPTools } from '@/components/webmcp/model/use-webmcp-tools';

export function WebMCPProvider() {
  const tools = useWebMCPTools();

  useEffect(() => {
    if (!hasModelContext()) {
      return;
    }

    let cleanup = () => {};
    const requestIdle =
      globalThis.requestIdleCallback ??
      ((callback: IdleRequestCallback) =>
        window.setTimeout(() => callback({} as IdleDeadline), 0));
    const cancelIdle = globalThis.cancelIdleCallback ?? window.clearTimeout;

    const idleId = requestIdle(() => {
      cleanup = registerWebMCPTools(tools);
    });

    return () => {
      cancelIdle(idleId);
      cleanup();
    };
  }, [tools]);

  return null;
}
```

- [ ] **Step 5: Dynamically mount the provider in root layout**

Create `src/components/webmcp/index.ts`:

```ts
export { WebMCPProvider } from './ui/webmcp-provider';
```

Modify `src/app/layout.tsx`. Add this dynamic import near the existing dynamic imports:

```tsx
const WebMCPProvider = dynamic(
  () => import('@/components/webmcp').then(mod => mod.WebMCPProvider),
  {
    ssr: false,
  }
);
```

Inside `<ThemeProvider>`, place the provider before the visible app UI:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  storageKey="theme"
  enableSystem
  disableTransitionOnChange
>
  <WebMCPProvider />
  <TooltipProvider>
    <Signature />
    {children}
```

- [ ] **Step 6: Run provider and type checks**

Run:

```bash
pnpm test:unit src/components/webmcp/ui/webmcp-provider.spec.tsx
pnpm check-types
```

Expected: PASS for both commands.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/components/webmcp/model/use-webmcp-tools.ts src/components/webmcp/ui/webmcp-provider.tsx src/components/webmcp/ui/webmcp-provider.spec.tsx src/components/webmcp/index.ts src/app/layout.tsx
git commit -m "feat(webmcp): provider 연결 및 route별 도구 등록"
```

## Task 6: Shuffle Letters Declarative and Imperative Execution

**Files:**

- Modify: `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.tsx`
- Modify: `src/app/playground/shuffle-letters/page.tsx`
- Create: `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx`

- [ ] **Step 1: Write failing MDX shuffle tests**

Create `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/article/lib/shuffle-letters', () => ({
  shuffleLetters: vi.fn((_element, options) => {
    options?.onComplete?.();
    return vi.fn();
  }),
}));

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
import { MDXShuffleLettersDemo } from './shuffle-letters-demo';

describe('MDXShuffleLettersDemo WebMCP integration', () => {
  it('exposes declarative WebMCP form annotations', () => {
    render(<MDXShuffleLettersDemo />);

    const form = screen.getByRole('form', {
      name: 'Shuffle letters playground',
    });

    expect(form).toHaveAttribute('toolname', 'run_shuffle_letters');
    expect(form).toHaveAttribute('toolautosubmit');
    expect(screen.getByLabelText('텍스트')).toHaveAttribute(
      'toolparamdescription',
      'Text to animate with the shuffle letters effect.'
    );
  });

  it('runs visible animation when the WebMCP custom event is dispatched', () => {
    render(<MDXShuffleLettersDemo />);

    window.dispatchEvent(
      new CustomEvent('webmcp:run-shuffle-letters', {
        detail: {
          text: 'Agent text',
          iterations: 9,
          fps: 24,
        },
      })
    );

    expect(screen.getByDisplayValue('Agent text')).toBeTruthy();
    expect(shuffleLetters).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        iterations: 9,
        fps: 24,
      })
    );
  });
});
```

- [ ] **Step 2: Run the failing MDX shuffle test**

Run:

```bash
pnpm test:unit src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx
```

Expected: FAIL because the form has no WebMCP annotations and no event listener.

- [ ] **Step 3: Refactor MDX shuffle start logic**

Modify `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.tsx`. Add this type near the props type:

```ts
type ShuffleLettersPayload = {
  text: string;
  iterations: number;
  fps: number;
};

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (promise: Promise<unknown>) => void;
};
```

Replace the existing `handleSubmit` with `startAnimation` plus `handleSubmit`:

```ts
const startAnimation = useCallback(
  ({
    text: nextText,
    iterations: nextIterations,
    fps: nextFps,
  }: ShuffleLettersPayload) => {
    if (isAnimating || !animatedTextRef.current) return false;

    setText(nextText);
    setIterations(nextIterations);
    setFps(nextFps);
    animatedTextRef.current.textContent = nextText;
    setIsAnimating(true);
    clearAnimationRef.current = shuffleLetters(animatedTextRef.current, {
      iterations: nextIterations,
      fps: nextFps,
      onComplete: () => {
        setIsAnimating(false);
        clearAnimationRef.current = null;
      },
    });

    return true;
  },
  [isAnimating]
);

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const started = startAnimation({ text, iterations, fps });
  const nativeEvent = e.nativeEvent as AgentSubmitEvent;

  if (nativeEvent.agentInvoked && nativeEvent.respondWith) {
    nativeEvent.respondWith(
      Promise.resolve({
        ok: started,
        text,
        iterations,
        fps,
      })
    );
  }
};
```

Add this event effect below the Escape-key effect:

```ts
useEffect(() => {
  const handleRun = (event: Event) => {
    const { detail } = event as CustomEvent<ShuffleLettersPayload>;
    if (!detail) return;
    startAnimation(detail);
  };

  const handleStop = () => {
    stopAnimation();
  };

  window.addEventListener('webmcp:run-shuffle-letters', handleRun);
  window.addEventListener('webmcp:stop-shuffle-letters', handleStop);

  return () => {
    window.removeEventListener('webmcp:run-shuffle-letters', handleRun);
    window.removeEventListener('webmcp:stop-shuffle-letters', handleStop);
  };
}, [startAnimation, stopAnimation]);
```

- [ ] **Step 4: Add declarative attributes to the MDX form and inputs**

In `src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.tsx`, change the form opening tag to:

```tsx
<form
  aria-label="Shuffle letters playground"
  toolname="run_shuffle_letters"
  tooldescription="Runs the shuffle letters animation with visible form values."
  toolautosubmit
  onSubmit={handleSubmit}
  className="w-full max-w-md space-y-4"
>
```

Add `name` and `toolparamdescription` to the text input:

```tsx
<Input
  id="text"
  name="text"
  type="text"
  value={text || ''}
  onChange={e => setText(e.target.value)}
  toolparamdescription="Text to animate with the shuffle letters effect."
  required
/>
```

Add `name` and `toolparamdescription` to the iterations input:

```tsx
<Input
  id="iterations"
  name="iterations"
  type="number"
  value={iterations}
  onChange={e => setIterations(Number(e.target.value))}
  min="1"
  max="50"
  toolparamdescription="Number of random character replacements per letter. Use 1 through 50."
  required
/>
```

Add `name` and `toolparamdescription` to the fps input:

```tsx
<Input
  id="fps"
  name="fps"
  type="number"
  value={fps}
  onChange={e => setFps(Number(e.target.value))}
  min="1"
  max="60"
  toolparamdescription="Animation frames per second. Use 1 through 60."
  required
/>
```

- [ ] **Step 5: Add WebMCP execution to the standalone playground**

Modify `src/app/playground/shuffle-letters/page.tsx`. Add these types below the imports:

```ts
type ShuffleLettersPayload = {
  text: string;
  iterations: number;
  fps: number;
};

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (promise: Promise<unknown>) => void;
};
```

Replace the existing `handleSubmit` with this `startAnimation` and `handleSubmit` pair:

```ts
const startAnimation = useCallback(
  ({
    text: nextText,
    iterations: nextIterations,
    fps: nextFps,
  }: ShuffleLettersPayload) => {
    if (isAnimating || !animatedTextRef.current) return false;

    setText(nextText);
    setIterations(nextIterations);
    setFps(nextFps);
    animatedTextRef.current.textContent = nextText;
    setIsAnimating(true);
    clearAnimationRef.current = shuffleLetters(animatedTextRef.current, {
      iterations: nextIterations,
      fps: nextFps,
      onComplete: () => {
        setIsAnimating(false);
        clearAnimationRef.current = null;
      },
    });

    return true;
  },
  [isAnimating]
);

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const started = startAnimation({ text, iterations, fps });
  const nativeEvent = e.nativeEvent as AgentSubmitEvent;

  if (nativeEvent.agentInvoked && nativeEvent.respondWith) {
    nativeEvent.respondWith(
      Promise.resolve({
        ok: started,
        text,
        iterations,
        fps,
      })
    );
  }
};
```

Add this effect below the existing Escape-key effect:

```ts
useEffect(() => {
  const handleRun = (event: Event) => {
    const { detail } = event as CustomEvent<ShuffleLettersPayload>;
    if (!detail) return;
    startAnimation(detail);
  };

  const handleStop = () => {
    stopAnimation();
  };

  window.addEventListener('webmcp:run-shuffle-letters', handleRun);
  window.addEventListener('webmcp:stop-shuffle-letters', handleStop);

  return () => {
    window.removeEventListener('webmcp:run-shuffle-letters', handleRun);
    window.removeEventListener('webmcp:stop-shuffle-letters', handleStop);
  };
}, [startAnimation, stopAnimation]);
```

Change the standalone form opening tag to:

```tsx
<form
  aria-label="Shuffle letters playground"
  toolname="run_shuffle_letters"
  tooldescription="Runs the shuffle letters animation with visible form values."
  toolautosubmit
  onSubmit={handleSubmit}
  className="w-full max-w-md rounded-lg p-6 shadow-md"
>
```

Change the standalone text input to include `name` and `toolparamdescription`:

```tsx
<input
  id="text"
  name="text"
  type="text"
  value={text}
  onChange={e => setText(e.target.value)}
  toolparamdescription="Text to animate with the shuffle letters effect."
  className="w-full rounded-md border border-input px-3 py-2"
  required
/>
```

Change the standalone iterations input to include `name` and `toolparamdescription`:

```tsx
<input
  id="iterations"
  name="iterations"
  type="number"
  value={iterations}
  onChange={e => setIterations(Number(e.target.value))}
  min="1"
  max="50"
  toolparamdescription="Number of random character replacements per letter. Use 1 through 50."
  className="w-full rounded-md border border-input px-3 py-2"
  required
/>
```

Change the standalone fps input to include `name` and `toolparamdescription`:

```tsx
<input
  id="fps"
  name="fps"
  type="number"
  value={fps}
  onChange={e => setFps(Number(e.target.value))}
  min="1"
  max="60"
  toolparamdescription="Animation frames per second. Use 1 through 60."
  className="w-full rounded-md border border-input px-3 py-2"
  required
/>
```

- [ ] **Step 6: Run shuffle tests**

Run:

```bash
pnpm test:unit src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.tsx src/app/playground/shuffle-letters/page.tsx src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx
git commit -m "feat(webmcp): shuffle letters 도구 실행 지원"
```

## Task 7: Permissions Policy, Focus Styles, and Project Docs

**Files:**

- Modify: `next.config.mjs`
- Modify: `src/globals.css`
- Modify: `docs/architecture.md`
- Modify: `docs/conventions.md`

- [ ] **Step 1: Update Permissions-Policy**

Modify the `Permissions-Policy` header in `next.config.mjs` from:

```js
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=()',
},
```

to:

```js
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=(), tools=(self)',
},
```

- [ ] **Step 2: Add WebMCP focus styles**

Add this block inside `@layer base` in `src/globals.css`, near the existing `.header-anchor` rule:

```css
form:tool-form-active {
  outline: hsl(var(--ring)) dashed 1px;
  outline-offset: 4px;
}

button:tool-submit-active {
  outline: hsl(var(--primary)) dashed 1px;
  outline-offset: 2px;
}
```

- [ ] **Step 3: Document architecture**

Append this section to `docs/architecture.md`:

```md
## WebMCP

WebMCP is implemented as a progressive enhancement. The root layout dynamically
mounts `WebMCPProvider` with `ssr: false`, and the provider exits immediately
unless the browser exposes `navigator.modelContext`.

The provider registers route-relevant tools only during idle time and aborts
the previous registration on route changes. Content search does not build a
global index during page load. It fetches `/api/webmcp/content-index` only when
the `find_content` tool runs, then reuses the in-memory result for the current
browser session.

The WebMCP surface is intentionally limited to safe visible actions:

- internal navigation
- content metadata search
- current article/craft context snippets
- heading scroll
- code block copy
- theme and sound settings
- shuffle letters playground execution

External links and `mailto:` links are not opened automatically by WebMCP tools.
Cross-origin iframes do not receive `allow="tools"`.
```

- [ ] **Step 4: Document conventions**

Append this section to `docs/conventions.md`:

```md
## WebMCP

WebMCP code lives under `src/components/webmcp/` and follows the domain
component barrel export rule. Import it as `@/components/webmcp`.

Rules:

- Always feature-detect `navigator.modelContext` before creating schemas,
  scanning DOM, or registering tools.
- Register tools during idle time through `registerWebMCPTools`.
- Use `AbortController` cleanup for every registration lifecycle.
- Keep tool outputs small. Article and craft tools may return metadata,
  TL;DR, headings, and short excerpts, but not full MDX bodies.
- Keep external navigation manual. WebMCP tools may return external URLs but
  must not automatically open them.
- Add declarative attributes only to real forms with visible user-facing
  controls.
- Use HSL CSS variables for `:tool-form-active` and `:tool-submit-active`
  styles.
```

- [ ] **Step 5: Run static checks**

Run:

```bash
pnpm check-types
pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add next.config.mjs src/globals.css docs/architecture.md docs/conventions.md
git commit -m "docs(webmcp): 적용 규칙과 권한 정책 문서화"
```

## Task 8: Final Verification

**Files:**

- Review: all files changed by Tasks 1 through 7

- [ ] **Step 1: Run WebMCP unit tests**

Run:

```bash
pnpm test:unit src/components/webmcp/lib/register-tool.spec.ts src/components/webmcp/lib/content-index.spec.ts src/app/api/webmcp/content-index/route.spec.ts src/components/webmcp/lib/content-snapshot.spec.ts src/components/webmcp/model/tool-handlers.spec.ts src/components/webmcp/ui/webmcp-provider.spec.tsx src/mdx/components/shuffle-letters-demo/shuffle-letters-demo.spec.tsx
```

Expected: PASS.

- [ ] **Step 2: Run affected existing tests**

Run:

```bash
pnpm test:unit src/components/sound/ui/sound-switcher.spec.tsx src/components/series/test/series-navigation-top.spec.tsx src/components/series/test/series-navigation-bottom.spec.tsx src/mdx/mdx.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run full static verification**

Run:

```bash
pnpm check-types
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS. The build must not report route errors for `/api/webmcp/content-index`.

- [ ] **Step 5: Manual WebMCP QA in Chrome**

Use Chrome with `chrome://flags/#enable-webmcp-testing` enabled and the Model Context Tool Inspector Extension installed.

Check these routes:

```text
/
/article
/article/<known-article-slug>
/craft
/craft/<known-craft-slug>
/playground/shuffle-letters
```

Expected:

- `/` registers global tools only.
- `/article` and `/craft` register global tools plus content search/open tools.
- article/craft detail pages register current content context and heading tools.
- pages with code blocks register `copy_code_block`.
- pages with series navigation register `open_series`.
- `/playground/shuffle-letters` registers `run_shuffle_letters` and `stop_shuffle_letters`.
- Unsupported browsers have no console errors and no visible UI changes.

- [ ] **Step 6: Review final history**

Run:

```bash
git log --oneline -8
git status --short
```

Expected:

- The latest commits are the focused WebMCP commits from this plan.
- `git status --short` contains only user-owned pre-existing untracked files, such as `github-profile-README.md`, or is clean.
