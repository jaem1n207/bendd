# Gaegu Content Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Gaegu handwriting font to `/article/[slug]` and `/craft/[slug]` detail reading surfaces without introducing font privacy, performance, layout shift, or readability regressions.

**Architecture:** The two detail routes already share `MdxLayout`, so load Gaegu there with `next/font/google` instead of changing the root layout. Scope the generated CSS variable to the detail section, apply the handwriting family only to the title, TL;DR, and MDX article body, and explicitly keep code, tables, and custom non-prose widgets on the existing sans/mono fonts. Use `font-display: optional`, no preload, and only weights 400/700 because the handwriting font is an aesthetic enhancement rather than a blocker for reading.

**Tech Stack:** Next.js 14 App Router, `next/font/google`, React Server Components, Tailwind Typography, CSS Modules, Playwright E2E, pnpm.

---

## PRD

**User:** Korean-first readers of bendd.me article and craft detail pages.

**Problem:** The current detail pages use the same neutral sans typography as the rest of the site, so long-form writing does not carry the handwritten, personal tone shown in the user's reference image.

**Desired outcome:** Detail-page Korean prose feels handwritten and warmer while remaining readable, fast, stable, and accessible.

**Non-goals:**

- Do not change article or craft list pages.
- Do not change navigation, table-of-contents, Giscus comments, OG image generation, RSS, sitemap, or MDX parsing.
- Do not add a package or vendor font binaries.
- Do not load fonts from a third-party browser request at runtime.

**Success criteria:**

- `/article/[slug]` and `/craft/[slug]` detail pages use Gaegu on the reading surface.
- Code blocks and inline code remain monospace.
- Tables and `.not-prose` interactive MDX components remain in the existing UI font.
- The browser sends no runtime font request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Font loading cannot hide content, because `font-display: optional` allows fallback text immediately.
- The article body line-height remains at least 1.7x font size.
- `pnpm check-types`, the focused Playwright test, and `pnpm build` pass.

## File Structure

- Modify `src/components/layout/mdx.tsx`
  - Import `Gaegu` from `next/font/google`.
  - Define the scoped font loader.
  - Add the generated CSS variable to `#BenddDoc`.
  - Apply CSS module classes to title, TL;DR, and article body.
- Create `src/components/layout/mdx-layout.module.css`
  - Owns only detail-page typography safeguards.
  - Sets the handwriting family, readable line-height, Korean line breaking, and font-synthesis guard.
  - Resets code/pre/table/`.not-prose` descendants to mono or sans.
- Modify `tests/mdx-rendering.spec.ts`
  - Add Playwright checks for the article detail typography contract.
  - Add the same basic contract for craft detail pages.
- Modify `docs/conventions.md`
  - Document the new scoped detail-page font rule and performance/accessibility constraints.
- Create this plan file `docs/superpowers/plans/2026-07-09-gaegu-content-font.md`
  - Records the implementation plan and verification strategy.

## Task 1: Record The Plan

**Files:**

- Create: `docs/superpowers/plans/2026-07-09-gaegu-content-font.md`

- [ ] **Step 1: Add the plan file**

Use `apply_patch` to create `docs/superpowers/plans/2026-07-09-gaegu-content-font.md` with the contents of this plan.

- [ ] **Step 2: Verify the plan file exists**

Run:

```bash
test -f docs/superpowers/plans/2026-07-09-gaegu-content-font.md
```

Expected: exit code `0`.

- [ ] **Step 3: Commit the plan**

Run:

```bash
git add docs/superpowers/plans/2026-07-09-gaegu-content-font.md
git commit -m "docs(plan): Gaegu 본문 폰트 계획 추가"
```

Expected: a commit is created with only the plan file.

## Task 2: Apply Scoped Gaegu Typography

**Files:**

- Modify: `src/components/layout/mdx.tsx`
- Create: `src/components/layout/mdx-layout.module.css`
- Modify: `tests/mdx-rendering.spec.ts`

- [ ] **Step 1: Add the layout CSS module**

Create `src/components/layout/mdx-layout.module.css` with this exact content:

```css
.handwritingText {
  font-family: var(--font-content-handwriting), var(--font-sans), system-ui,
    sans-serif;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.handwritingTitle {
  line-height: 1.35;
  font-weight: 700;
}

.handwritingSummary {
  line-height: 1.8;
  font-weight: 400;
}

.handwritingArticle {
  font-family: var(--font-content-handwriting), var(--font-sans), system-ui,
    sans-serif;
  font-size: 1.0625rem;
  line-height: 1.9;
  word-break: keep-all;
  overflow-wrap: break-word;
  font-synthesis-weight: none;
  text-rendering: optimizeLegibility;
}

.handwritingArticle :global(p),
.handwritingArticle :global(li),
.handwritingArticle :global(blockquote) {
  line-height: 1.9;
}

.handwritingArticle :global(pre),
.handwritingArticle :global(code),
.handwritingArticle :global(kbd),
.handwritingArticle :global(samp) {
  font-family: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.handwritingArticle :global(table),
.handwritingArticle :global(table *),
.handwritingArticle :global(.not-prose),
.handwritingArticle :global(.not-prose *) {
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

- [ ] **Step 2: Import Gaegu and the CSS module**

In `src/components/layout/mdx.tsx`, replace the import block start with:

```tsx
import { CornerUpLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Gaegu as FontContentHandwriting } from 'next/font/google';
import Link from 'next/link';

import { Giscus } from '@/components/comments/giscus';
```

Add this CSS module import near the other local imports:

```tsx
import styles from '@/components/layout/mdx-layout.module.css';
```

- [ ] **Step 3: Define the scoped font loader**

In `src/components/layout/mdx.tsx`, after the `TableOfContents` dynamic import and before `interface MdxLayoutProps`, add:

```tsx
const contentHandwritingFont = FontContentHandwriting({
  weight: ['400', '700'],
  display: 'optional',
  preload: false,
  variable: '--font-content-handwriting',
});
```

- [ ] **Step 4: Scope the font variable and apply classes**

In `src/components/layout/mdx.tsx`, change the `<section>` opening tag to include the generated variable:

```tsx
      <section
        id="BenddDoc"
        className={contentHandwritingFont.variable}
        data-webmcp-content
```

Change the title typography to:

```tsx
<Typography
  variant="h2"
  className={cn(styles.handwritingText, styles.handwritingTitle)}
>
  {title}
</Typography>
```

Change the TL;DR typography class to:

```tsx
        <Typography
          variant="blockquote"
          className={cn(
            'mt-6 break-keep',
            styles.handwritingText,
            styles.handwritingSummary
          )}
          asChild
        >
```

Change the `<article>` classes and add an explicit marker for tests:

```tsx
        <article
          data-content-font="gaegu"
          className={cn(
            'prose prose-slate mb-24 dark:prose-invert md:mb-40',
            styles.handwritingArticle,
            type === 'article' ? 'mt-16 md:mt-24' : 'mt-40 md:mt-52'
          )}
        >
```

- [ ] **Step 5: Add Playwright font contract tests**

Append these tests to `tests/mdx-rendering.spec.ts` inside the existing describe blocks:

```ts
test('should use scoped Gaegu typography without breaking code readability', async ({
  page,
}) => {
  const fontRequests: string[] = [];
  page.on('request', request => {
    if (request.resourceType() === 'font') {
      fontRequests.push(request.url());
    }
  });

  await page.goto('/article/naming-tokens-in-design');

  const article = page.locator('article[data-content-font="gaegu"]');
  await expect(article).toBeVisible();

  const articleMetrics = await article.evaluate(element => {
    const style = window.getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });

  expect(articleMetrics.fontFamily).toContain('Gaegu');
  expect(
    articleMetrics.lineHeight / articleMetrics.fontSize
  ).toBeGreaterThanOrEqual(1.7);

  const code = article.locator('code').first();
  await expect(code).toBeVisible();
  const codeFontFamily = await code.evaluate(
    element => window.getComputedStyle(element).fontFamily
  );

  expect(codeFontFamily).not.toContain('Gaegu');
  expect(
    fontRequests.every(url => {
      const requestUrl = new URL(url);
      return requestUrl.origin === new URL(page.url()).origin;
    })
  ).toBe(true);
});
```

Append this craft test inside `test.describe('MDX craft detail pages', () => { ... })`:

```ts
test('should use the same scoped content font contract on craft details', async ({
  page,
}) => {
  await page.goto('/craft/implement-rauno-style-text-animation');

  const article = page.locator('article[data-content-font="gaegu"]');
  await expect(article).toBeVisible();

  const fontFamily = await article.evaluate(
    element => window.getComputedStyle(element).fontFamily
  );

  expect(fontFamily).toContain('Gaegu');
});
```

- [ ] **Step 6: Run focused typecheck**

Run:

```bash
pnpm check-types
```

Expected: exits `0`.

- [ ] **Step 7: Run focused Playwright regression**

Run:

```bash
pnpm build
pnpm test:e2e -- tests/mdx-rendering.spec.ts --project=chromium
```

Expected: build succeeds and the Chromium MDX rendering tests pass. If `pnpm build` fails because the sandbox blocks Google font fetches during `next/font` build-time self-hosting, rerun `pnpm build` with sandbox escalation and do not change the implementation to a runtime external font request.

- [ ] **Step 8: Commit the implementation**

Run:

```bash
git add src/components/layout/mdx.tsx src/components/layout/mdx-layout.module.css tests/mdx-rendering.spec.ts
git commit -m "feat(article): 상세 본문 손글씨 폰트 적용"
```

Expected: a commit is created with only implementation and regression-test files.

## Task 3: Document The Font Rule

**Files:**

- Modify: `docs/conventions.md`

- [ ] **Step 1: Update the font convention**

In `docs/conventions.md`, replace the current font section with:

```markdown
## 폰트

Inter (sans)와 Fira Mono (mono)를 Google Fonts에서 로드한다. CSS 변수로 적용:

- `--font-sans` -> Inter
- `--font-mono` -> Fira Mono

`display: 'swap'` 설정으로 FOUT를 방지한다. 필요한 weight만 로드한다 (전체 로드 금지).

Article/Craft 상세 본문은 `MdxLayout`에서만 `Gaegu`를 추가로 로드한다:

- `--font-content-handwriting` -> Gaegu
- 적용 범위: `/article/[slug]`, `/craft/[slug]`의 제목, TL;DR, MDX 본문
- 제외 범위: navigation, TOC, Giscus, code/pre/kbd/samp, table, `.not-prose` MDX 위젯
- 로딩 정책: `display: 'optional'`, `preload: false`, weight `400`/`700`만 사용

손글씨 폰트는 장식적 향상 요소이므로 느린 네트워크에서 fallback이 유지되어도 읽기 경험을 우선한다. 런타임에 `fonts.googleapis.com` 또는 `fonts.gstatic.com`을 직접 호출하지 말고 `next/font`의 self-hosting을 유지한다.
```

- [ ] **Step 2: Run docs formatting check**

Run:

```bash
pnpm format:check
```

Expected: exits `0`.

- [ ] **Step 3: Commit docs**

Run:

```bash
git add docs/conventions.md
git commit -m "docs(conventions): 상세 본문 폰트 규칙 추가"
```

Expected: a commit is created with only the conventions file.

## Final Verification

- [ ] **Step 1: Run full unit checks**

Run:

```bash
pnpm test:unit --run
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run final build**

Run:

```bash
pnpm build
```

Expected: production build succeeds. If local sandbox network blocks Google font self-hosting fetches, rerun with approved escalation because production Vercel will fetch at build time, not from the user's browser.

- [ ] **Step 3: Review the diff**

Run:

```bash
git diff --stat main...HEAD
git diff main...HEAD -- src/components/layout/mdx.tsx src/components/layout/mdx-layout.module.css tests/mdx-rendering.spec.ts docs/conventions.md
```

Expected: diff contains only the scoped font implementation, regression tests, and docs.

- [ ] **Step 4: Push and open Draft PR**

Run:

```bash
git push -u origin feat/gaegu-content-font
gh pr create --draft --title "feat(article): 상세 본문 손글씨 폰트 적용" --body "<body from final summary>" --assignee jaem1n207
```

Expected: Draft PR is created and assigned to `jaem1n207`.

## Self-Review

**Spec coverage:** The plan applies Gaegu to article and craft detail pages, prevents runtime third-party font requests through `next/font`, avoids critical-path preload, uses `font-display: optional`, keeps code/tables/widgets readable, adds E2E regression checks, updates docs, and creates a PR.

**Placeholder scan:** The plan contains exact paths, exact code, exact commands, and exact expected outcomes.

**Type consistency:** The CSS class names `handwritingText`, `handwritingTitle`, `handwritingSummary`, and `handwritingArticle` are defined in the CSS module and used consistently in `MdxLayout`.
