---
name: bendd-craft-series-publishing
description: Publish or update bendd.me `/craft` MDX series content. Use when adding craft articles, moving writing into `/craft`, creating or updating craft series pages, wiring series metadata, validating frontmatter, assets, sitemap, structured data, and the craft content pipeline.
---

# Bendd Craft Series Publishing

Use this for bendd-specific content publishing work. Pair it with `mdx-authoring` for MDX syntax/frontmatter rules and `content-workflow` for processor and route behavior.

## Preflight

1. Read `AGENTS.md` and `src/mdx/AGENTS.md` when touching MDX rendering or components.
2. Inspect the target content path, `src/mdx/mdx.ts`, `src/lib/series.ts`, and the relevant route files before editing.
3. Confirm whether the content belongs in `content/` (`/article`) or `craft/` (`/craft`). Do not mix processors.
4. Keep branch names free of `codex/` when the work will become a PR.

## Craft Article Rules

- Place craft content under `craft/<category>/<slug>.mdx`.
- Set frontmatter with the repo limits:
  - `title` <= 38 chars
  - `summary` <= 40 chars
  - `description` <= 150 chars
  - `category` must match the parent folder name
  - `publishedAt` must be `YYYY-MM-DD`
- For a series post, include `series` and `seriesOrder`.
- Use absolute media paths from `public/`, such as `/images/<slug>/image.png`.
- Put images after the paragraph that gives readers the context needed to understand them.

## Series Wiring

When adding a craft series or converting a standalone craft post into a series:

1. Add or update the series entry in `src/lib/series.ts`.
2. Set `contentType: 'craft'`.
3. Use `/craft/series/<id>` for the route.
4. Use `createCraftMDXProcessor()` for craft pages and `createMDXProcessor()` only for article pages.
5. Keep `/article/series/*` scoped to article series and `/craft/series/*` scoped to craft series.

## Tests To Check

Update focused tests when behavior changes:

- `src/lib/series.spec.ts`
- `src/mdx/mdx.spec.ts`
- `src/app/sitemap.spec.ts`
- `src/lib/structured-data/structured-data.spec.ts`
- Route or component tests affected by the change

Use real fixture values that match the MDX frontmatter. If the published date changes before merge, update the content and any matching fixtures together.

## Validation

Run the smallest useful set first, then full validation before handoff:

```bash
pnpm check-types
pnpm lint
pnpm exec vitest run <focused specs>
pnpm build
```

Also run targeted text checks when relevant:

```bash
rg -n "forbidden text|old date" craft src tests
rg -n "/images/<slug>/" craft/<category>/<slug>.mdx
rg --files public/images/<slug>
```

## Handoff Notes

Report:

- article and series URLs
- frontmatter date and series metadata
- tests/build run
- any existing lint warnings
- any asset files intentionally kept because they are referenced
