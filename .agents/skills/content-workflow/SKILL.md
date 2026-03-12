---
name: content-workflow
description: |
  Work with bendd.me's content pipeline — MDXProcessor queries, content
  directory management, article listing, and static generation. Use when
  querying articles, filtering content, working with generateStaticParams,
  modifying route handlers, or understanding the content-to-page pipeline.
  Triggers on: MDXProcessor, getArticles, formatForDisplay, sortByDateDesc,
  filterByCategory, generateStaticParams, article route, craft route,
  content pipeline, static generation.
  NOT for writing MDX content (use mdx-authoring).
---

# Content Workflow

How bendd.me processes MDX content from file to rendered page.

## Pipeline Overview

```
.mdx file (content/ or craft/)
  -> getMDXFiles()        reads all .mdx recursively
  -> parseFrontmatter()   extracts YAML + body
  -> validateMetadata()   Zod schema validation (build fails on error)
  -> MDXProcessor         lazy evaluation chain
  -> [slug]/page.tsx      static generation + rendering
  -> CustomMDX            remark/rehype plugins + component registry
  -> MdxLayout            TOC, comments (Giscus), JSON-LD schema
```

## MDXProcessor (Immutable Lazy Evaluation)

Located at `src/mdx/mdx.ts`. Operations queue until a terminal method is called.

### Chain Methods (intermediate — return new MDXProcessor)

```typescript
processor.sortByDateDesc();
processor.filterByCategory('react');
processor.limit(5);
```

### Terminal Methods (execute the chain)

```typescript
processor.getArticles(); // -> ReadonlyArray<Article>
processor.getArticleBySlug(slug); // -> Article | undefined
processor.map(fn); // -> T[]
processor.formatForDisplay(opts); // -> formatted articles
```

### Usage in Route Handlers

```typescript
// src/app/article/[slug]/page.tsx
import { createMDXProcessor } from '@/mdx/mdx';

export async function generateStaticParams() {
  const processor = createMDXProcessor();
  return processor.map(article => article.slug);
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const processor = createMDXProcessor();
  const post = processor.getArticleBySlug(params.slug);
  if (!post) notFound();
  // render...
}
```

### Two Processors — Two Routes

```typescript
// ARTICLES: content/ directory
import { createMDXProcessor } from '@/mdx/mdx';
const processor = createMDXProcessor();
// Routes to: /article/[slug]

// CRAFT: craft/ directory
import { createCraftMDXProcessor } from '@/mdx/mdx';
const craftProcessor = createCraftMDXProcessor();
// Routes to: /craft/[slug]
```

NEVER use `createMDXProcessor()` for craft/ content or vice versa.

## Content Directory Layout

```
content/
  react/
    perfect-dark-mode.mdx        -> /article/perfect-dark-mode
    immediate-motion-component.mdx -> /article/immediate-motion-component
  css/
    some-css-article.mdx         -> /article/some-css-article

craft/
  animation/
    text-animation.mdx           -> /craft/text-animation
```

The category in frontmatter MUST match the parent folder name.

## MdxLayout Component

Located at `src/components/layout/mdx.tsx`. Renders:

- Article metadata (title, date, description)
- `<CustomMDX source={post.content} />` with remark/rehype plugins
- Table of Contents (auto-generated from headings via rehype-slug)
- Giscus comments (syncs theme via postMessage)
- JSON-LD schema.org structured data

## Remark/Rehype Plugins

Configured in `src/mdx/custom-mdx.tsx`:

- `remark-gfm` — GitHub Flavored Markdown (tables, strikethrough)
- `remark-smartypants` — smart quotes, dashes
- `rehype-pretty-code` — syntax highlighting via Shiki
- `rehype-slug` — auto heading IDs for TOC

## Static Generation

All articles are statically generated at build time:

- `generateStaticParams()` creates routes for every article
- `generateMetadata()` creates OG images, canonical URLs
- OG images generated dynamically at `/api/og` (Edge Runtime)

## Adding a New Article

1. Create `.mdx` file in `content/{category}/` or `craft/{category}/`
2. Add valid frontmatter (see mdx-authoring skill for schema)
3. The route is auto-generated from the filename (slug)
4. No manual route registration needed — `generateStaticParams()` handles it
5. Verify with `pnpm build` — frontmatter errors surface at build time

## Common Mistakes

- Using wrong processor for wrong directory
- Calling chain methods after terminal methods (chain is consumed)
- Forgetting `notFound()` when `getArticleBySlug()` returns undefined
- Category in frontmatter not matching folder name
- Assuming MDXProcessor is mutable (it's immutable — each method returns new instance)
