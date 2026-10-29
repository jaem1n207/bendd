---
name: bendd-technical-blog-publish
description: Orchestrate the full bendd.me technical blog publishing workflow from raw feature topic to `/craft` article, visuals, validation, PR creation or update, final PR checks, merge, and publication. Use when the user wants to write and publish a product-centered technical blog post in bendd without repeatedly prompting each step.
---

# Bendd Technical Blog Publish

Use this as the top-level workflow when the user brings a technical blog topic and wants to end with a published bendd `/craft` post.

This skill coordinates:

- `technical-blog-product-story` for writing and review
- `human-proofreader` MCP for conservative Korean prose editing and source comparison
- `bendd-craft-series-publishing` for MDX and craft series wiring
- `bendd-visual-article-polish` for visual/readability QA
- `jaemin-ship` or repo git workflow for PR creation
- `bendd-pr-finalize` for final PR update, checks, merge, and branch cleanup

## Operating Mode

Proceed end to end when the user asks to write and publish. Do not make the user re-supply the long blog-writing prompt.

Ask only when:

- a factual experience is missing
- a product claim would otherwise be invented
- the user must choose a core direction
- publication or merge needs explicit confirmation

## Workflow

### 1. Start With The Writing Workflow

Invoke `technical-blog-product-story` behavior first.

Required outputs before MDX implementation:

- problem-centered topic framing
- enough interview material
- five core-message candidates
- approved or clearly selected core message
- problem-solving outline with visual suggestions
- section drafts
- UX deep analysis
- critical review
- polished final draft

Do not start `/craft` implementation from a weak or incomplete draft.

### 2. Proofread Korean Prose

After the draft and its technical claims have been reviewed, use the `human-proofreader` MCP before implementing the MDX. For existing articles, apply the same step to the prose being revised.

Follow [Korean proofreading](references/korean-proofreading.md) for protected content, tool arguments, comparison, and failure handling. Start with `genre: 블로그`, `strength: 보수`, and `depth: standard`; the standard pass already includes reading through the draft.

Review the changes before applying them. Keep technical fact-checking separate, preserve code and MDX exactly, and validate the assembled MDX in the local validation step below. Do not silently skip an unavailable or rejected proofreading pass.

### 3. Prepare The Bendd Content Plan

Decide:

- slug
- craft category folder
- title, summary, description
- published date
- series id and order
- required visual assets
- whether the post starts a new series or joins an existing one

Respect frontmatter limits from `AGENTS.md` and `mdx-authoring`.

### 4. Publish As `/craft`

Use `bendd-craft-series-publishing` behavior.

Implement:

- `craft/<category>/<slug>.mdx`
- `public/images/<slug>/...` assets
- series metadata in `src/lib/series.ts` when needed
- route, sitemap, structured-data, or test updates when required

Use MDX components already present in `src/mdx/components` before creating new ones. If a new MDX component is needed, follow `createMDXComponent` and Zod rules.

### 5. Polish Visual Reading Experience

Use `bendd-visual-article-polish` behavior.

Check:

- visual placement matches nearby prose
- screenshots/GIFs explain actual product behavior
- images can zoom consistently
- captions remain visible when zoomed
- TOC width and section spacing are readable
- mobile layouts do not overflow
- unused assets are removed only when truly unreferenced

### 6. Validate Locally

Before running the relevant checks, compare the assembled article against the pre-proofreading source. Confirm that protected code, inline code, URLs, frontmatter, MDX tags/props, and imports/exports remain unchanged by proofreading. Validate MDX syntax and frontmatter through the existing content pipeline; an MCP comparison is not an MDX validation.

If visual polish changed prose after proofreading, review and compare only the affected passages again. Reuse the successful pass for unchanged text.

Run the relevant checks before PR handoff:

```bash
pnpm check-types
pnpm lint
pnpm exec vitest run <focused specs>
pnpm build
```

If layout changed, inspect desktop and mobile renderings. Do not claim visual polish without rendered evidence when screenshots/browser tools are available.

### 7. Create Or Update The PR

If there is no PR yet:

- create a branch without a `codex/` prefix
- commit atomically using Conventional Commit Korean messages
- push the branch
- create a Draft PR assigned to `jaem1n207`

If there is already a PR:

- update title/body to match the current article and verification
- keep assignee `jaem1n207`
- mention visual assets and cleanup result

### 8. Finalize And Merge

Use `bendd-pr-finalize` behavior.

Before merge:

- update `publishedAt` to the final merge-date basis requested by the user
- update mirrored fixtures or structured data dates
- search for stale phrases and previous dates
- confirm no unused visual assets remain
- push final commits
- mark Draft PR ready
- wait for required checks
- handle merge method fallback
- delete remote/local branch
- verify PR state is `MERGED`

## Final Report

Report:

- final article URL
- series URL, if any
- PR URL and merge commit
- proofreading status, comparison findings, and any unresolved or skipped passages
- checks run
- visual asset cleanup result
- any non-blocking warnings or pending optional bots
