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

## Content System

| Directory  | Route             | Processor                   | Purpose              |
| ---------- | ----------------- | --------------------------- | -------------------- |
| `content/` | `/article/[slug]` | `createMDXProcessor()`      | Blog articles        |
| `craft/`   | `/craft/[slug]`   | `createCraftMDXProcessor()` | Experimental content |

Same frontmatter schema, different display formatters and route prefixes.

## Key Patterns

- **MDXProcessor**: Immutable chaining with lazy evaluation — operations queue until `getArticles()` / `formatForDisplay()` / `map()`
- **Zustand persist**: localStorage with named keys (e.g., `sound-enabled`)
- **Theme sync**: `useThemeManager` syncs next-themes with giscus iframe via `postMessage`
- **Dynamic imports**: Client-only components need `dynamic(() => import(...), { ssr: false })` in Server Component layouts
- **OG images**: Dynamically generated at `/api/og` (Edge Runtime), not static files
- **MDX security**: `blockJS: false` + `blockDangerousJS: true` (CVE-2026-0969) — do not change

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

Pre-commit hook runs `pnpm check-types` on TS/TSX + `prettier --write` on MD/MDX.

## Docs Index

| Document                                     | Contents                                                      |
| -------------------------------------------- | ------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | Content system, layer dependencies, routing, security headers |
| [docs/conventions.md](docs/conventions.md)   | Naming rules, file structure, MDX patterns, CSS, commits      |
| [docs/pitfalls.md](docs/pitfalls.md)         | 20 common agent mistakes with correct/incorrect examples      |
| [docs/decisions.md](docs/decisions.md)       | ADR-lite: why we chose specific patterns (Zod, HSL, etc.)     |
| [docs/commands.md](docs/commands.md)         | Dev commands, test runners, build workflow                    |
