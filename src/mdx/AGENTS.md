# MDX System

> MDX processing pipeline: content parsing → validation → rendering with custom components.
> Parent: [../../AGENTS.md](../../AGENTS.md)

## Structure

```
src/mdx/
├── mdx.ts              # MDXProcessor class + factories (core pipeline)
├── custom-mdx.tsx      # CustomMDX renderer, component registry, plugin chain
├── mdx.module.css      # Container styles
├── common/
│   ├── create-mdx-component.ts     # Zod wrapper (ALL components must use this)
│   ├── copy-to-clipboard/          # Code block copy button
│   ├── step-content/               # Step rendering (4 files)
│   └── table-of-contents/          # TOC sidebar (5 files, complex scroll sync)
├── components/                     # 10 component directories → 13 registered tags
│   ├── a/              # MDXCustomLink — external link detection
│   ├── callout/        # MDXCallout — info/warning/error boxes
│   ├── heading/        # MDXHeading — h2/h3/h4 with anchor links
│   ├── ime-scroll-demo/# MDXImeScrollDemo — interactive demo (201 lines)
│   ├── img/            # MDXRoundedImage — SVG fallback to <img>
│   ├── magic-move/     # MDXMagicMove — animated code transitions
│   ├── pre/            # MDXPre — code blocks with copy button
│   ├── shuffle-letters-demo/ # MDXShuffleLettersDemo — letter animation
│   ├── steps/          # MDXSteps — numbered step guides
│   └── video/          # MDXAutoplayVideo + MDXPreLoadVideo
└── lib/
    ├── ensure-local-storage.ts     # localStorage polyfill (twoslash needs it in SSR)
    └── ensure-local-storage.spec.ts
```

## Component Registry

`custom-mdx.tsx:33` maps MDX tags → React components:

| MDX Tag              | Component               | Source                             |
| -------------------- | ----------------------- | ---------------------------------- |
| `h2`, `h3`, `h4`     | `MDXHeading`            | `components/heading/`              |
| `img`                | `MDXRoundedImage`       | `components/img/`                  |
| `a`                  | `MDXCustomLink`         | `components/a/`                    |
| `pre`                | `MDXPre`                | `components/pre/`                  |
| `AutoplayVideo`      | `MDXAutoplayVideo`      | `components/video/`                |
| `PreLoadVideo`       | `MDXPreLoadVideo`       | `components/video/`                |
| `MagicMove`          | `MDXMagicMove`          | `components/magic-move/`           |
| `Callout`            | `MDXCallout`            | `components/callout/`              |
| `Steps`              | `MDXSteps`              | `components/steps/`                |
| `ShuffleLettersDemo` | `MDXShuffleLettersDemo` | `components/shuffle-letters-demo/` |
| `ImeScrollDemo`      | `MDXImeScrollDemo`      | `components/ime-scroll-demo/`      |

**Adding a component**: Create `components/{name}/{name}.tsx` → wrap with `createMDXComponent` + Zod → import and add to `components` object in `custom-mdx.tsx`.

## Plugin Chain

`CustomMDX` (line 76) runs `next-mdx-remote/rsc` with:

**Remark** (Markdown → MDAST): `remark-gfm`, `remark-smartypants`

**Rehype** (MDAST → HAST): `rehype-pretty-code` (Shiki, dual theme: `github-light` / `vitesse-dark`, 9 transformers including twoslash), `rehype-slug` (heading IDs for TOC)

Twoslash is loaded async via `loadTwoslashTransformer()` — needs `ensureLocalStorage()` polyfill because Shiki's twoslash accesses localStorage during SSR.

## MDXProcessor API

`mdx.ts` — Immutable chaining, lazy evaluation:

```typescript
// Operations queue until terminal method
createMDXProcessor()
  .sortByDateDesc() // queues sort
  .filterByCategory('react') // queues filter
  .limit(5) // queues limit
  .formatForDisplay(); // EXECUTES all queued ops, returns formatted data

// Terminal methods: getArticles(), formatForDisplay(), formatForCraftDisplay(), map()
```

Two factories: `createMDXProcessor()` reads `content/`, `createCraftMDXProcessor()` reads `craft/`. Difference: `formatForDisplay()` includes relative dates, `formatForCraftDisplay()` does not.

## Table of Contents (complex subsystem)

`common/table-of-contents/` — 5 files:

- `use-toc.ts`: `useActiveAnchor` hook — scroll sync with passive listeners + `requestAnimationFrame`. **No static NodeList caching** (P22) — always queries live DOM because React re-renders can replace nodes.
- `table-of-contents.tsx`: Renders TOC sidebar with active link highlighting
- `skeleton-table-of-contents.tsx`: Loading skeleton
- `toc.d.ts`: Type definitions
- `use-toc.spec.ts`: 245-line test — INP regression tests, multi-highlight bug prevention

## Security

```
blockJS: false           // MagicMove needs JS expressions (codeSnippets={[...]})
blockDangerousJS: true   // Blocks eval, Function, process, require (CVE-2026-0969)
```

All MDX loaded from local files only — `blockJS: false` is safe. **Do not change these settings.**

## Validation

`createMDXComponent` (line 7) wraps every component with Zod validation:

- Runs only when `VERCEL_ENV !== 'production'` (dev/preview only)
- Uses `zod-validation-error` for readable error messages
- Catches prop mismatches at render time, not build time
