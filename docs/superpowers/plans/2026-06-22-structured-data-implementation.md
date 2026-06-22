# Structured Data Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered JSON-LD objects with a typed, test-covered structured-data graph system and add homepage `SoftwareApplication` metadata.

**Architecture:** Add focused structured-data helpers under `src/lib/structured-data/`, render them through one shared `JsonLdScript` component, and update existing pages to call page-level graph builders. The generated JSON-LD stays server-rendered, uses stable `@id` values, and does not change visible UI.

**Tech Stack:** Next.js 14 App Router, React Server Components, TypeScript, Vitest, Testing Library, schema-dts, pnpm.

---

## File Structure

- Create `src/lib/structured-data/ids.ts`: URL and `@id` helpers only.
- Create `src/lib/structured-data/nodes.ts`: shared schema.org node builders.
- Create `src/lib/structured-data/graphs.ts`: page-level graph composition.
- Create `src/lib/structured-data/index.ts`: public exports for route files.
- Create `src/lib/structured-data/structured-data.spec.ts`: ID, node, and graph unit tests.
- Create `src/components/structured-data/json-ld-script.tsx`: safe script renderer.
- Create `src/components/structured-data/json-ld-script.spec.tsx`: renderer escaping test.
- Create `src/components/structured-data/index.ts`: component barrel export.
- Modify `src/app/layout.tsx`: remove direct root `WebSite` script.
- Modify `src/app/page.tsx`: render home graph and share homepage project data.
- Modify `src/app/article/page.tsx`: render article index graph.
- Modify `src/app/craft/page.tsx`: render craft index graph.
- Modify `src/app/article/series/[id]/page.tsx`: render series graph.
- Modify `src/components/layout/mdx.tsx`: render detail graph.

## Task 1: ID Helpers and Script Renderer

**Files:**

- Create: `src/lib/structured-data/ids.ts`
- Create: `src/lib/structured-data/structured-data.spec.ts`
- Create: `src/components/structured-data/json-ld-script.tsx`
- Create: `src/components/structured-data/json-ld-script.spec.tsx`
- Create: `src/components/structured-data/index.ts`

- [ ] **Step 1: Write failing ID and renderer tests**

Create `src/components/structured-data/json-ld-script.spec.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonLdScript } from './json-ld-script';

describe('JsonLdScript', () => {
  it('serializes JSON-LD and escapes HTML-sensitive angle brackets', () => {
    const { container } = render(
      <JsonLdScript
        data={{
          '@context': 'https://schema.org',
          '@type': 'Thing',
          name: '<script>alert("x")</script>',
        }}
      />
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );

    expect(script?.innerHTML).toContain('\\u003cscript>');
    expect(script?.innerHTML).not.toContain('<script>alert');
  });
});
```

Add the ID helper test block to `src/lib/structured-data/structured-data.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  blogId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from './ids';

describe('structured data ID helpers', () => {
  it('creates stable absolute URLs and schema node IDs', () => {
    expect(absoluteUrl('/article')).toBe('https://bendd.me/article');
    expect(absoluteUrl('craft/demo')).toBe('https://bendd.me/craft/demo');
    expect(websiteId()).toBe('https://bendd.me/#website');
    expect(personId()).toBe('https://bendd.me/#person');
    expect(blogId()).toBe('https://bendd.me/article#blog');
    expect(webpageId('/article')).toBe('https://bendd.me/article#webpage');
    expect(breadcrumbId('/article')).toBe(
      'https://bendd.me/article#breadcrumb'
    );
    expect(softwareApplicationId('sync-tabs')).toBe(
      'https://bendd.me/#software-sync-tabs'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test:unit src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.spec.tsx --run
```

Expected: FAIL because the files or exports do not exist.

- [ ] **Step 3: Implement ID helpers**

Create `src/lib/structured-data/ids.ts`:

```ts
import { siteMetadata } from '@/lib/site-metadata';

const stripTrailingSlash = (value: string) => value.replace(/\/$/, '');
const stripLeadingSlash = (value: string) => value.replace(/^\//, '');

export const absoluteUrl = (path = ''): string => {
  const baseUrl = stripTrailingSlash(siteMetadata.siteUrl);
  const normalizedPath = stripLeadingSlash(path);

  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
};

export const websiteId = () => `${absoluteUrl()}#website`;
export const personId = () => `${absoluteUrl()}#person`;
export const blogId = () => `${absoluteUrl('/article')}#blog`;
export const webpageId = (path: string) => `${absoluteUrl(path)}#webpage`;
export const breadcrumbId = (path: string) => `${absoluteUrl(path)}#breadcrumb`;
export const softwareApplicationId = (slug: string) =>
  `${absoluteUrl()}#software-${slug}`;
export const blogPostingId = (path: string) =>
  `${absoluteUrl(path)}#blogposting`;
```

- [ ] **Step 4: Implement `JsonLdScript`**

Create `src/components/structured-data/json-ld-script.tsx`:

```tsx
type JsonLdScriptProps = {
  data: unknown;
};

const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
```

Create `src/components/structured-data/index.ts`:

```ts
export { JsonLdScript } from './json-ld-script';
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm test:unit src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.spec.tsx --run
```

Expected: PASS for the ID helper and renderer tests.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/structured-data/ids.ts src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.tsx src/components/structured-data/json-ld-script.spec.tsx src/components/structured-data/index.ts
git commit -m "feat(structured-data): JSON-LD 식별자와 스크립트 렌더러 추가"
```

## Task 2: Shared Node Builders and Page Graphs

**Files:**

- Create: `src/lib/structured-data/nodes.ts`
- Create: `src/lib/structured-data/graphs.ts`
- Create: `src/lib/structured-data/index.ts`
- Modify: `src/lib/structured-data/structured-data.spec.ts`

- [ ] **Step 1: Add failing graph tests**

Append these helpers and tests to `src/lib/structured-data/structured-data.spec.ts`:

```ts
import type { Graph, Thing } from 'schema-dts';

import {
  createArticleDetailGraph,
  createArticleIndexGraph,
  createCraftDetailGraph,
  createHomeGraph,
} from './graphs';

type NodeWithType = Thing & { '@id'?: string; '@type': string | string[] };

const findNode = (graph: Graph, type: string): NodeWithType => {
  const node = graph['@graph'].find(item => {
    const itemType = (item as NodeWithType)['@type'];
    return Array.isArray(itemType)
      ? itemType.includes(type)
      : itemType === type;
  });

  if (!node) {
    throw new Error(`Missing ${type} node`);
  }

  return node as NodeWithType;
};

const article = {
  slug: 'structured-data',
  content: '',
  metadata: {
    title: '구조화 데이터',
    publishedAt: '2026-06-22',
    category: 'seo',
    description: '검색 엔진이 글을 이해하도록 돕는 JSON-LD 개선',
    summary: 'JSON-LD 개선',
  },
};

describe('structured data graphs', () => {
  it('creates a home graph with profile and software application nodes', () => {
    const graph = createHomeGraph({
      project: {
        slug: 'synchronize-tab-scrolling',
        name: 'Synchronize Tab Scrolling',
        description: '여러 탭의 스크롤을 실시간으로 동기화합니다.',
        url: 'https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc',
        sameAs: 'https://github.com/jaem1n207/synchronize-tab-scrolling',
      },
    });

    expect(findNode(graph, 'WebSite')['@id']).toBe('https://bendd.me/#website');
    expect(findNode(graph, 'Person')['@id']).toBe('https://bendd.me/#person');
    expect(findNode(graph, 'ProfilePage').mainEntity).toEqual({
      '@id': 'https://bendd.me/#person',
    });
    expect(findNode(graph, 'SoftwareApplication').creator).toEqual({
      '@id': 'https://bendd.me/#person',
    });
  });

  it('links article postings to the article blog and webpage', () => {
    const graph = createArticleDetailGraph({ post: article });
    const posting = findNode(graph, 'BlogPosting');
    const webpage = findNode(graph, 'WebPage');

    expect(posting.mainEntityOfPage).toEqual({ '@id': webpage['@id'] });
    expect(posting.isPartOf).toEqual({
      '@id': 'https://bendd.me/article#blog',
    });
    expect(posting.author).toEqual({ '@id': 'https://bendd.me/#person' });
    expect(posting.publisher).toEqual({ '@id': 'https://bendd.me/#person' });
    expect(posting.image).toMatchObject({
      '@type': 'ImageObject',
      url: 'https://bendd.me/api/og?title=%EA%B5%AC%EC%A1%B0%ED%99%94%20%EB%8D%B0%EC%9D%B4%ED%84%B0',
    });
  });

  it('links craft postings to the website instead of the article blog', () => {
    const graph = createCraftDetailGraph({ post: article });
    const posting = findNode(graph, 'BlogPosting');

    expect(posting.isPartOf).toEqual({ '@id': 'https://bendd.me/#website' });
  });

  it('creates stable item list entries for article collections', () => {
    const graph = createArticleIndexGraph({ articles: [article] });
    const collection = findNode(graph, 'CollectionPage');

    expect(collection.mainEntity).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://bendd.me/article/structured-data',
          name: '구조화 데이터',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run graph tests to verify they fail**

Run:

```bash
pnpm test:unit src/lib/structured-data/structured-data.spec.ts --run
```

Expected: FAIL because `nodes.ts` and `graphs.ts` do not exist.

- [ ] **Step 3: Implement shared node builders**

Create `src/lib/structured-data/nodes.ts`:

```ts
import type {
  Blog,
  BlogPosting,
  BreadcrumbList,
  CollectionPage,
  Graph,
  ImageObject,
  ItemList,
  ListItem,
  Person,
  ProfilePage,
  SoftwareApplication,
  Thing,
  WebPage,
  WebSite,
} from 'schema-dts';

import { siteMetadata } from '@/lib/site-metadata';
import type { Article, SeriesInfo } from '@/mdx/mdx';

import {
  absoluteUrl,
  blogId,
  blogPostingId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from './ids';

type SchemaReference = { '@id': string };

export type HomeProject = {
  slug: string;
  name: string;
  description: string;
  url: string;
  sameAs: string;
};

export const reference = (id: string): SchemaReference => ({ '@id': id });

export const createGraph = (nodes: readonly Thing[]): Graph => ({
  '@context': 'https://schema.org',
  '@graph': nodes,
});

export const createWebsiteNode = ({
  slim = false,
}: {
  slim?: boolean;
} = {}): WebSite => ({
  '@type': 'WebSite',
  '@id': websiteId(),
  url: absoluteUrl(),
  name: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  ...(slim
    ? {}
    : {
        alternateName: [siteMetadata.title, 'bendd.me'],
        description: siteMetadata.description,
        inLanguage: siteMetadata.language,
        publisher: reference(personId()),
      }),
});

export const createPersonNode = (): Person => ({
  '@type': 'Person',
  '@id': personId(),
  url: absoluteUrl(),
  name: siteMetadata.author,
  alternateName: 'jaem1n207',
  jobTitle: '소프트웨어 엔지니어',
  description: '해야 하는 일 속에서 하고 싶은 의미를 찾는 소프트웨어 엔지니어',
  knowsLanguage: siteMetadata.language,
  sameAs: [siteMetadata.github, siteMetadata.youtube],
});

export const createBreadcrumbNode = ({
  path,
  items,
}: {
  path: string;
  items: ReadonlyArray<{ name: string; path: string }>;
}): BreadcrumbList => ({
  '@type': 'BreadcrumbList',
  '@id': breadcrumbId(path),
  itemListElement: items.map<ListItem>((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const createProfilePageNode = (): ProfilePage => ({
  '@type': 'ProfilePage',
  '@id': webpageId('/'),
  url: absoluteUrl(),
  name: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  description:
    '작업하며 마주한 문제와 해결 과정을 정리해 공유합니다. 이 글이 누군가에게 도움이 되길 바랍니다.',
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  mainEntity: reference(personId()),
});

export const createBlogNode = (): Blog => ({
  '@type': 'Blog',
  '@id': blogId(),
  name: `${siteMetadata.author}의 기술 이야기`,
  description: '경험과 지식을 공유하는 공간입니다.',
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  mainEntityOfPage: reference(webpageId('/article')),
  publisher: reference(personId()),
});

export const createItemListNode = ({
  entries,
}: {
  entries: ReadonlyArray<{ position: number; url: string; name: string }>;
}): ItemList => ({
  '@type': 'ItemList',
  itemListElement: entries.map<ListItem>(entry => ({
    '@type': 'ListItem',
    position: entry.position,
    url: entry.url,
    name: entry.name,
  })),
});

export const createCollectionPageNode = ({
  path,
  name,
  description,
  breadcrumbPath,
  mainEntity,
}: {
  path: string;
  name: string;
  description: string;
  breadcrumbPath: string;
  mainEntity: ItemList;
}): CollectionPage => ({
  '@type': 'CollectionPage',
  '@id': webpageId(path),
  url: absoluteUrl(path),
  name,
  description,
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  breadcrumb: reference(breadcrumbId(breadcrumbPath)),
  mainEntity,
});

export const createWebPageNode = ({
  path,
  name,
  description,
}: {
  path: string;
  name: string;
  description: string;
}): WebPage => ({
  '@type': 'WebPage',
  '@id': webpageId(path),
  url: absoluteUrl(path),
  name,
  description,
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  breadcrumb: reference(breadcrumbId(path)),
});

export const createBlogPostingImageNode = ({
  path,
  title,
  image,
}: {
  path: string;
  title: string;
  image?: string;
}): ImageObject => ({
  '@type': 'ImageObject',
  '@id': `${blogPostingId(path)}-image`,
  url: image
    ? absoluteUrl(image)
    : absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`),
  width: 1200,
  height: 630,
});

export const createBlogPostingNode = ({
  post,
  path,
  partOf,
}: {
  post: Article;
  path: string;
  partOf: SchemaReference;
}): BlogPosting => ({
  '@type': 'BlogPosting',
  '@id': blogPostingId(path),
  url: absoluteUrl(path),
  headline: post.metadata.title,
  description: post.metadata.summary,
  datePublished: new Date(post.metadata.publishedAt).toISOString(),
  dateModified: new Date(post.metadata.publishedAt).toISOString(),
  inLanguage: siteMetadata.language,
  mainEntityOfPage: reference(webpageId(path)),
  isPartOf: partOf,
  author: reference(personId()),
  publisher: reference(personId()),
  image: createBlogPostingImageNode({
    path,
    title: post.metadata.title,
    image: post.metadata.image,
  }),
});

export const createSoftwareApplicationNode = ({
  project,
}: {
  project: HomeProject;
}): SoftwareApplication => ({
  '@type': 'SoftwareApplication',
  '@id': softwareApplicationId(project.slug),
  url: project.url,
  name: project.name,
  description: project.description,
  applicationCategory: 'BrowserApplication',
  operatingSystem: 'Chrome, Firefox, Edge',
  creator: reference(personId()),
  sameAs: project.sameAs,
  offers: {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'USD',
  },
});

export const createSeriesItemListNode = ({
  seriesInfo,
}: {
  seriesInfo: SeriesInfo;
}): ItemList =>
  createItemListNode({
    entries: seriesInfo.articles.map(article => ({
      position: article.order,
      url: absoluteUrl(`/article/${article.slug}`),
      name: article.title,
    })),
  });
```

- [ ] **Step 4: Implement page graph composition**

Create `src/lib/structured-data/graphs.ts`:

```ts
import type { Article, SeriesInfo } from '@/mdx/mdx';

import { absoluteUrl, blogId, websiteId } from './ids';
import {
  type HomeProject,
  createBlogNode,
  createBlogPostingNode,
  createBreadcrumbNode,
  createCollectionPageNode,
  createGraph,
  createItemListNode,
  createPersonNode,
  createProfilePageNode,
  createSeriesItemListNode,
  createSoftwareApplicationNode,
  createWebPageNode,
  createWebsiteNode,
  reference,
} from './nodes';

export const createHomeGraph = ({ project }: { project: HomeProject }) =>
  createGraph([
    createWebsiteNode(),
    createPersonNode(),
    createProfilePageNode(),
    createSoftwareApplicationNode({ project }),
  ]);

export const createArticleIndexGraph = ({
  articles,
}: {
  articles: ReadonlyArray<Article>;
}) => {
  const itemList = createItemListNode({
    entries: articles.map((article, index) => ({
      position: index + 1,
      url: absoluteUrl(`/article/${article.slug}`),
      name: article.metadata.title,
    })),
  });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path: '/article',
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
      ],
    }),
    createCollectionPageNode({
      path: '/article',
      name: '기술 이야기',
      description: '경험과 지식을 공유하는 공간입니다.',
      breadcrumbPath: '/article',
      mainEntity: itemList,
    }),
    createBlogNode(),
  ]);
};

export const createCraftIndexGraph = ({
  articles,
}: {
  articles: ReadonlyArray<Article>;
}) => {
  const itemList = createItemListNode({
    entries: articles.map((article, index) => ({
      position: index + 1,
      url: absoluteUrl(`/craft/${article.slug}`),
      name: article.metadata.title,
    })),
  });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path: '/craft',
      items: [
        { name: '홈', path: '/' },
        { name: '작업 목록', path: '/craft' },
      ],
    }),
    createCollectionPageNode({
      path: '/craft',
      name: '작업 목록',
      description: '작업한 결과물을 모아놓은 공간입니다.',
      breadcrumbPath: '/craft',
      mainEntity: itemList,
    }),
  ]);
};

export const createArticleDetailGraph = ({ post }: { post: Article }) => {
  const path = `/article/${post.slug}`;

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBlogNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
        { name: post.metadata.title, path },
      ],
    }),
    createWebPageNode({
      path,
      name: post.metadata.title,
      description: post.metadata.description,
    }),
    createBlogPostingNode({
      post,
      path,
      partOf: reference(blogId()),
    }),
  ]);
};

export const createCraftDetailGraph = ({ post }: { post: Article }) => {
  const path = `/craft/${post.slug}`;

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '작업 목록', path: '/craft' },
        { name: post.metadata.title, path },
      ],
    }),
    createWebPageNode({
      path,
      name: post.metadata.title,
      description: post.metadata.description,
    }),
    createBlogPostingNode({
      post,
      path,
      partOf: reference(websiteId()),
    }),
  ]);
};

export const createSeriesGraph = ({
  seriesInfo,
}: {
  seriesInfo: SeriesInfo;
}) => {
  const path = `/article/series/${seriesInfo.id}`;
  const itemList = createSeriesItemListNode({ seriesInfo });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
        { name: `${seriesInfo.name} 시리즈`, path },
      ],
    }),
    createCollectionPageNode({
      path,
      name: `${seriesInfo.name} 시리즈`,
      description: seriesInfo.description,
      breadcrumbPath: path,
      mainEntity: itemList,
    }),
  ]);
};
```

Create `src/lib/structured-data/index.ts`:

```ts
export {
  createArticleDetailGraph,
  createArticleIndexGraph,
  createCraftDetailGraph,
  createCraftIndexGraph,
  createHomeGraph,
  createSeriesGraph,
} from './graphs';
```

- [ ] **Step 5: Run graph tests**

Run:

```bash
pnpm test:unit src/lib/structured-data/structured-data.spec.ts --run
```

Expected: PASS for ID and graph tests.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/structured-data
git commit -m "feat(structured-data): 페이지별 JSON-LD 그래프 빌더 추가"
```

## Task 3: Home and Root Layout Integration

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove root layout JSON-LD ownership**

In `src/app/layout.tsx`, delete this import:

```ts
import type { WebSite, WithContext } from 'schema-dts';
```

Delete the `websiteJsonLd` constant and delete the `<script type="application/ld+json" ... />` block inside `<body>`. The root layout still owns metadata, providers, navigation, analytics, and speed insights.

- [ ] **Step 2: Add home graph data and renderer**

In `src/app/page.tsx`, replace the schema-dts import with:

```ts
import { JsonLdScript } from '@/components/structured-data';
import { createHomeGraph } from '@/lib/structured-data';
```

Replace the old `personJsonLd` constant with:

```ts
const synchronizeTabScrollingProject = {
  slug: 'synchronize-tab-scrolling',
  name: 'Synchronize Tab Scrolling',
  description:
    '여러 탭의 스크롤을 실시간으로 동기화하는 오픈소스 브라우저 확장 프로그램입니다.',
  url: 'https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc',
  sameAs: 'https://github.com/jaem1n207/synchronize-tab-scrolling',
} as const;

const homeJsonLd = createHomeGraph({
  project: synchronizeTabScrollingProject,
});
```

Replace the existing home `<script type="application/ld+json" ... />` with:

```tsx
<JsonLdScript data={homeJsonLd} />
```

- [ ] **Step 3: Run targeted checks**

Run:

```bash
pnpm check-types
pnpm test:unit src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.spec.tsx --run
```

Expected: typecheck passes and both structured-data test files pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat(structured-data): 홈 JSON-LD 그래프 연결"
```

## Task 4: Collection and Series Page Integration

**Files:**

- Modify: `src/app/article/page.tsx`
- Modify: `src/app/craft/page.tsx`
- Modify: `src/app/article/series/[id]/page.tsx`

- [ ] **Step 1: Update article index page**

In `src/app/article/page.tsx`, delete the schema-dts import and add:

```ts
import { JsonLdScript } from '@/components/structured-data';
import { createArticleIndexGraph } from '@/lib/structured-data';
```

Replace the inline `collectionJsonLd` object with:

```ts
const collectionJsonLd = createArticleIndexGraph({ articles });
```

Replace the inline `<script type="application/ld+json" ... />` with:

```tsx
<JsonLdScript data={collectionJsonLd} />
```

- [ ] **Step 2: Update craft index page**

In `src/app/craft/page.tsx`, delete the schema-dts import and add:

```ts
import { JsonLdScript } from '@/components/structured-data';
import { createCraftIndexGraph } from '@/lib/structured-data';
```

Replace the inline `collectionJsonLd` object with:

```ts
const collectionJsonLd = createCraftIndexGraph({ articles });
```

Replace the inline `<script type="application/ld+json" ... />` with:

```tsx
<JsonLdScript data={collectionJsonLd} />
```

- [ ] **Step 3: Update series page**

In `src/app/article/series/[id]/page.tsx`, delete the schema-dts import and add:

```ts
import { JsonLdScript } from '@/components/structured-data';
import { createSeriesGraph } from '@/lib/structured-data';
```

Replace the inline `collectionJsonLd` object with:

```ts
const collectionJsonLd = createSeriesGraph({ seriesInfo });
```

Replace the inline `<script type="application/ld+json" ... />` with:

```tsx
<JsonLdScript data={collectionJsonLd} />
```

- [ ] **Step 4: Run targeted checks**

Run:

```bash
pnpm check-types
pnpm test:unit src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.spec.tsx --run
```

Expected: typecheck passes and structured-data tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/article/page.tsx src/app/craft/page.tsx 'src/app/article/series/[id]/page.tsx'
git commit -m "feat(structured-data): 목록 페이지 JSON-LD 그래프 연결"
```

## Task 5: Article and Craft Detail Integration

**Files:**

- Modify: `src/components/layout/mdx.tsx`

- [ ] **Step 1: Replace inline detail JSON-LD**

In `src/components/layout/mdx.tsx`, delete this import:

```ts
import type { BreadcrumbList, BlogPosting, WithContext } from 'schema-dts';
```

Add:

```ts
import { JsonLdScript } from '@/components/structured-data';
import {
  createArticleDetailGraph,
  createCraftDetailGraph,
} from '@/lib/structured-data';
```

Replace the inline `jsonLd` and `breadcrumbJsonLd` constants with:

```ts
const detailJsonLd =
  type === 'article'
    ? createArticleDetailGraph({ post })
    : createCraftDetailGraph({ post });
```

Replace the two inline `<script type="application/ld+json" ... />` blocks with:

```tsx
<JsonLdScript data={detailJsonLd} />
```

- [ ] **Step 2: Search for remaining direct JSON-LD serialization**

Run:

```bash
rg -n "JSON.stringify\\(|application/ld\\+json|WithContext|BlogPosting|BreadcrumbList|CollectionPage|WebSite|Person" src
```

Expected: `application/ld+json` appears only in `JsonLdScript`; `JSON.stringify` for JSON-LD appears only inside `json-ld-script.tsx`; old schema-dts imports are gone from route files and `MdxLayout`.

- [ ] **Step 3: Run targeted checks**

Run:

```bash
pnpm check-types
pnpm test:unit src/lib/structured-data/structured-data.spec.ts src/components/structured-data/json-ld-script.spec.tsx --run
```

Expected: typecheck passes and structured-data tests pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/components/layout/mdx.tsx
git commit -m "feat(structured-data): 상세 페이지 JSON-LD 그래프 연결"
```

## Task 6: Final Verification and Documentation Update

**Files:**

- Modify: `docs/plans/completed/seo-structured-data.md`

- [ ] **Step 1: Update completed SEO note**

Append this section to `docs/plans/completed/seo-structured-data.md`:

```md
## 2026-06-22 후속 개선

- JSON-LD 생성을 `src/lib/structured-data/`의 ID/node/graph builder로 이동
- `JsonLdScript` 공용 렌더러로 `<` escape 적용
- 홈 페이지에 `ProfilePage`와 `SoftwareApplication` 노드 추가
- article/craft 상세 페이지에 `WebPage`, `mainEntityOfPage`, `isPartOf`, `author`, `publisher` 연결 강화
- `/article`에 `Blog` 노드를 추가하고 article 상세 `BlogPosting`에서 참조
```

- [ ] **Step 2: Run full validation**

Run:

```bash
pnpm check-types
pnpm test:unit --run
pnpm build
```

Expected: typecheck passes, Vitest passes, and production build completes.

- [ ] **Step 3: Review final diff**

Run:

```bash
git status --short
git log --oneline --max-count=8
rg -n "JSON.stringify\\(|application/ld\\+json" src
```

Expected: only the documentation update is unstaged before the final commit; recent commits show the structured-data sequence; JSON-LD serialization is centralized in `JsonLdScript`.

- [ ] **Step 4: Commit documentation update**

Run:

```bash
git add docs/plans/completed/seo-structured-data.md
git commit -m "docs(structured-data): JSON-LD 그래프 개선 이력 기록"
```

- [ ] **Step 5: Push the completed work**

Run:

```bash
git push origin main
```

Expected: `main -> main` succeeds and `git status --short --branch` shows `## main...origin/main`.
