# AGENTS.md

> Canonical AI agent instructions for **bendd.me** — a Next.js 14 (App Router) personal blog.
> This file is the index. Detailed docs in [`docs/`](docs/).

## Critical Rules

These rules are non-negotiable. Violating them causes build failures or broken behavior.

1. **MDX validation**: ALL MDX components MUST use `createMDXComponent` wrapper + Zod schema
2. **Frontmatter limits**: title <= 38 chars, summary <= 40 chars, description <= 150 chars
3. **Package manager**: `pnpm` ONLY — npm/yarn cause lockfile conflicts
4. **Import alias**: `@/` ONLY — no relative imports (`../`)
5. **Barrel exports**: Import domain components via `index.ts` only, never from subdirectories
6. **CSS variables**: HSL format (`hsl(var(--name))`), not hex/RGB
7. **Commits**: Conventional Commits + Korean messages (`feat(scope): 한국어 설명`)
8. **PR Assignees**: PR 생성 시 반드시 `jaem1n207`을 Assignees로 등록 (`gh pr create` 시 `--assignee jaem1n207`)
9. **PR 후 브랜치 정리**: PR 병합 후 반드시 원격/로컬 브랜치를 삭제 (`gh pr merge --delete-branch`, 로컬: `git branch -d <branch>`)

## Structure

```
bendd/
├── content/                # Blog articles (MDX) → /article/[slug]
├── craft/                  # Experimental content (MDX) → /craft/[slug]
├── docs/                   # Architecture & convention docs (this index references them)
├── tests/                  # Playwright E2E tests (separate from unit tests)
├── html/                   # Static HTML assets (OG image backgrounds)
├── public/                 # Images, sounds, videos
└── src/
    ├── app/                # Next.js App Router (no nested layouts)
    │   ├── api/og/         # Dynamic OG image gen (Edge Runtime)
    │   ├── api/feed/       # RSS feed (rewritten from /rss.xml by middleware)
    │   ├── article/[slug]/ # Blog article pages (SSG via generateStaticParams)
    │   ├── craft/[slug]/   # Craft pages (SSG via generateStaticParams)
    │   └── playground/     # Interactive demos (hidden from bots via middleware)
    ├── components/         # Domain-based components (barrel export pattern)
    │   ├── article/        #   Article list/item display
    │   ├── comments/       #   Giscus integration
    │   ├── navigation/     #   Site navigation
    │   ├── sound/          #   Sound toggle (Zustand + persist)
    │   ├── theme/          #   Theme switching + giscus sync
    │   └── ui/             #   shadcn/ui primitives (flat, no barrel)
    ├── hooks/              # Global hooks
    ├── lib/                # Global utilities (cn, constants)
    └── mdx/                # MDX processing system (see src/mdx/AGENTS.md)
        ├── common/         #   Shared MDX infra (createMDXComponent, TOC, copy-to-clipboard)
        ├── components/     #   13 custom MDX components
        └── lib/            #   MDX utilities
```

## Where to Look

| Task                 | Location                                 | Notes                                                         |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Add blog article     | `content/{category}/`                    | Must pass `MetadataSchema` validation                         |
| Add craft content    | `craft/`                                 | Uses `createCraftMDXProcessor` (no relative dates)            |
| New MDX component    | `src/mdx/components/{name}/`             | Register in `src/mdx/custom-mdx.tsx`                          |
| New domain component | `src/components/{domain}/`               | Must have `index.ts` barrel export                            |
| Add shadcn component | `src/components/ui/`                     | `pnpm dlx shadcn@latest add <name>`                           |
| Modify routing       | `src/app/`                               | Check `src/middleware.ts` for rewrites                        |
| Change colors        | `src/globals.css` + `tailwind.config.ts` | HSL in both `:root` and `.dark`                               |
| Security headers     | `next.config.mjs`                        | CSP allowlist — update when adding external services          |
| Unit test            | Co-locate as `*.spec.{ts,tsx}` in `src/` | Vitest + jsdom                                                |
| E2E test             | `tests/*.spec.ts`                        | Playwright, needs `pnpm build && pnpm start` first            |
| OG image             | `src/app/api/og/route.tsx`               | Edge Runtime, 658 lines — reads `Sec-CH-Prefers-Color-Scheme` |

## Content System

| Directory  | Route             | Processor                   | Purpose              |
| ---------- | ----------------- | --------------------------- | -------------------- |
| `content/` | `/article/[slug]` | `createMDXProcessor()`      | Blog articles        |
| `craft/`   | `/craft/[slug]`   | `createCraftMDXProcessor()` | Experimental content |

Same frontmatter schema, different display formatters and route prefixes.

## Key Patterns

- **MDX 함수 API**: 순수 함수 기반 — `readArticles()` → `sortByDateDesc()` / `findBySlug()` / `getSeriesInfo()` 등 조합
- **Zustand persist**: localStorage with named keys (e.g., `sound-enabled`)
- **Theme sync**: `useThemeManager` syncs next-themes with giscus iframe via `postMessage`
- **Dynamic imports**: Client-only components need `dynamic(() => import(...), { ssr: false })` in Server Component layouts
- **OG images**: Dynamically generated at `/api/og` (Edge Runtime), not static files
- **MDX security**: `blockJS: false` + `blockDangerousJS: true` (CVE-2026-0969) — do not change
- **Middleware**: `/rss.xml` → rewrites to `/api/feed`; `/playground/*` → returns 404 to bots
- **No nested layouts**: All routes share single root layout

## Code Map

| Symbol                     | Type       | Location                                      | Role                                                              |
| -------------------------- | ---------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `readArticles`             | Function   | `src/mdx/mdx.ts`                              | `content/` 디렉토리에서 글 목록 로드                              |
| `readCraftArticles`        | Function   | `src/mdx/mdx.ts`                              | `craft/` 디렉토리에서 글 목록 로드                                |
| `findBySlug`               | Function   | `src/mdx/mdx.ts`                              | 슬러그로 단일 글 조회                                             |
| `sortByDateDesc`           | Function   | `src/mdx/mdx.ts`                              | 날짜 내림차순 정렬                                                |
| `getSeriesInfo`            | Function   | `src/mdx/mdx.ts`                              | 시리즈 메타데이터 + 글 목록 조회                                  |
| `getSeriesSummaries`       | Function   | `src/mdx/mdx.ts`                              | 전체 시리즈 요약 목록                                             |
| `formatArticlesForDisplay` | Function   | `src/mdx/mdx.ts`                              | 글 목록을 ArticleInfo[]로 포맷 (시리즈 배지 포함)                 |
| `formatCraftsForDisplay`   | Function   | `src/mdx/mdx.ts`                              | craft 목록을 ArticleInfo[]로 포맷                                 |
| `MetadataSchema`           | Zod schema | `src/mdx/mdx.ts:8`                            | Frontmatter validation (title/summary/description limits)         |
| `createMDXComponent`       | Wrapper    | `src/mdx/common/create-mdx-component.ts`      | Props validation via Zod for all MDX components                   |
| `CustomMDX`                | Component  | `src/mdx/custom-mdx.tsx:76`                   | MDX renderer — plugin chain + component registry                  |
| `components`               | Registry   | `src/mdx/custom-mdx.tsx:33`                   | Maps MDX tags → React components (13 entries, img → MDXZoomImage) |
| `useActiveAnchor`          | Hook       | `src/mdx/common/table-of-contents/use-toc.ts` | TOC scroll sync — passive listeners, no static NodeList cache     |

## Component Structure

```
src/components/{domain}/
├── index.ts    # Public API (barrel export)
├── ui/         # React components
├── model/      # Hooks (use-*.ts), stores (*-store.ts)
├── types/      # Type definitions (.d.ts)
├── consts/     # Constants
└── lib/        # Utilities
```

MDX components: `src/mdx/components/{name}/{name}.tsx` — register in `src/mdx/custom-mdx.tsx`.

## Anti-Patterns (This Project)

- `as any` / `@ts-ignore` — only 1 justified `@ts-expect-error` in `with-sound.tsx` (cloneElement typing)
- Hex/RGB colors — use HSL CSS variables only
- `npm install` / `yarn add` — pnpm only
- Static `NodeList` caching in scroll handlers — always query live DOM (P22)
- Synchronous `track()` calls — wrap in `requestIdleCallback` (P21)
- Scroll listeners without `{ passive: true }` — always include (P20)
- Missing `createMDXComponent` wrapper — every MDX component must use it (P1)
- Class-based processors with hidden state — use pure functions (MDXProcessor was removed for this reason)

## Development Commands

```bash
pnpm dev          # Dev server (:3000)
pnpm build        # Production build
pnpm test:unit    # Vitest (unit tests, src/**/*.spec.{ts,tsx})
pnpm test:e2e     # Playwright (E2E, tests/ directory)
pnpm lint         # ESLint
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier
pnpm check-types  # TypeScript type check
pnpm build-stats  # Bundle analyzer
```

Pre-commit hook runs `pnpm check-types` on TS/TSX + `prettier --write` on MD/MDX. ESLint NOT in pre-commit — run `pnpm lint:fix` manually.

## Deployment

Vercel-only. No GitHub Actions CI. Pipeline: `git push` → Vercel auto-deploys (`pnpm install` → `pnpm build`). `INTERNAL_UNEXPECTED_ERROR` on Vercel = likely infra issue, not code — verify with `pnpm build && pnpm start` locally first (P23).

## Docs Index

| Document                                     | Contents                                                      |
| -------------------------------------------- | ------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | Content system, layer dependencies, routing, security headers |
| [docs/conventions.md](docs/conventions.md)   | Naming rules, file structure, MDX patterns, CSS, commits      |
| [docs/pitfalls.md](docs/pitfalls.md)         | 24 common agent mistakes with correct/incorrect examples      |
| [docs/decisions.md](docs/decisions.md)       | ADR-lite: why we chose specific patterns (Zod, HSL, etc.)     |
| [docs/commands.md](docs/commands.md)         | Dev commands, test runners, build workflow                    |
| [docs/design-docs/](docs/design-docs/)       | Design documents for specific technical decisions             |

## Subdirectory Knowledge

| Path       | AGENTS.md                              | Focus                                                     |
| ---------- | -------------------------------------- | --------------------------------------------------------- |
| `src/mdx/` | [src/mdx/AGENTS.md](src/mdx/AGENTS.md) | MDX processor internals, component registry, plugin chain |
