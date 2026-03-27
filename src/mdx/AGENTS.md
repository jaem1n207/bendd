# MDX System

> MDX processing pipeline: content parsing → validation → rendering with custom components.
> Parent: [../../AGENTS.md](../../AGENTS.md)

## Structure

```
src/mdx/
├── mdx.ts              # 순수 함수 기반 콘텐츠 API (readArticles, sortByDateDesc, getSeriesInfo 등)
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

## MDX 함수 API

`mdx.ts` — 순수 함수 기반, 숨겨진 상태 없음:

```typescript
// 데이터 로딩
const articles = readArticles(); // content/ 디렉토리
const crafts = readCraftArticles(); // craft/ 디렉토리

// 조회 & 정렬 — 배열을 받아 배열을 반환
const sorted = sortByDateDesc(articles);
const post = findBySlug(articles, 'my-slug');

// 포맷팅
formatArticlesForDisplay(sorted, articles); // ArticleInfo[] (시리즈 배지 포함)
formatCraftsForDisplay(sorted); // ArticleInfo[] (시리즈 없음)

// 시리즈 — 항상 전체 컬렉션을 명시적으로 전달
getSeriesInfo(articles, 'ai-coding-agent', 1);
getSeriesSummaries(articles);
getSeriesBadges(articles);
```

모든 함수가 입력을 명시적으로 받으므로, 어떤 데이터에서 동작하는지 호출부에서 바로 알 수 있다.

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
