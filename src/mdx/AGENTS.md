# MDX System

> MDX processing pipeline: content parsing → validation → rendering with custom components.
> Parent: [../../AGENTS.md](../../AGENTS.md)

## Structure

```
src/mdx/
├── mdx.ts              # 순수 함수 기반 콘텐츠 API (readArticles, sortByDateDesc, formatArticlesForDisplay 등)
├── custom-mdx.tsx      # CustomMDX renderer, component registry, plugin chain
├── mdx.module.css      # Container styles
├── common/
│   ├── create-mdx-component.ts     # Zod wrapper (ALL components must use this)
│   ├── copy-to-clipboard/          # Code block copy button
│   ├── step-content/               # Step rendering (4 files)
│   └── table-of-contents/          # Right-edge reading rail (5 files)
├── components/                     # 13 component directories → 15 registered tags
│   ├── a/              # MDXCustomLink — external link detection
│   ├── callout/        # MDXCallout — info/warning/error boxes
│   ├── deep-dive/      # MDXDeepDive — expandable detail blocks
│   ├── heading/        # MDXHeading — h2/h3/h4 with anchor links
│   ├── ime-scroll-demo/# MDXImeScrollDemo — interactive demo (201 lines)
│   ├── img/            # Legacy rounded image helper
│   ├── magic-move/     # MDXMagicMove — animated code transitions
│   ├── pre/            # MDXPre — code blocks with copy button
│   ├── shuffle-letters-demo/ # MDXShuffleLettersDemo — letter animation
│   ├── steps/          # MDXSteps — numbered step guides
│   ├── video/          # MDXAutoplayVideo + MDXPreLoadVideo
│   ├── visual-stack/   # MDXVisualStack — layered visual layout
│   └── zoom-image/     # MDXZoomImage — interactive image zoom
└── lib/
    ├── ensure-local-storage.ts     # localStorage polyfill (twoslash needs it in SSR)
    └── ensure-local-storage.spec.ts
```

## Component Registry

`custom-mdx.tsx:33` maps MDX tags → React components:

| MDX Tag              | Component               | Source                             |
| -------------------- | ----------------------- | ---------------------------------- |
| `h2`, `h3`, `h4`     | `MDXHeading`            | `components/heading/`              |
| `img`                | `MDXZoomImage`          | `components/zoom-image/`           |
| `a`                  | `MDXCustomLink`         | `components/a/`                    |
| `pre`                | `MDXPre`                | `components/pre/`                  |
| `AutoplayVideo`      | `MDXAutoplayVideo`      | `components/video/`                |
| `PreLoadVideo`       | `MDXPreLoadVideo`       | `components/video/`                |
| `MagicMove`          | `MDXMagicMove`          | `components/magic-move/`           |
| `Callout`            | `MDXCallout`            | `components/callout/`              |
| `DeepDive`           | `MDXDeepDive`           | `components/deep-dive/`            |
| `VisualStack`        | `MDXVisualStack`        | `components/visual-stack/`         |
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

// 시리즈 — @/lib/series에서 import하고 전체 컬렉션을 명시적으로 전달
resolveSeries(articles, {
  id: 'ai-coding-agent',
  contentType: 'article',
  currentOrder: 1,
});
getSeriesSummaries(articles);
getSeriesBadges(articles);
```

모든 함수가 입력을 명시적으로 받으므로, 어떤 데이터에서 동작하는지 호출부에서 바로 알 수 있다.

## Table of Contents

`common/table-of-contents/` measures visible article `h2` and `h3` headings when content or layout changes, then updates proportional right-edge reading progress on scroll. The article title is the first segment; the rail is hidden when the article has no headings. It queries live DOM so replaced headings are reflected on the next update. The rail appears at 1280px and above, where the native page scrollbar is hidden. Its track scrolls within the measured article range, with a 44px-wide input area on touch devices. Dense sections are grouped into non-overlapping rail segments, with every heading available from the expandable full list. Hover and keyboard focus reveal complete labels; on touch devices the active label remains visible. `h3` segments are thinner, and completed section labels use the foreground color. At the document bottom, every segment is filled.

- `client-table-of-contents.tsx`: Client boundary and deferred rendering
- `table-of-contents.tsx`: Section measurement, progress, and accessible anchor links
- `table-of-contents.module.css`: Right-edge rail, hover/focus labels, reduced-motion styles
- `table-of-contents.spec.tsx`: Segment geometry, scroll progress, and live-heading regression tests
- `toc.d.ts`: Heading level type shared with MDX headings

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
