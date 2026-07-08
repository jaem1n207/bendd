# Pretendard Content Font Plan

## Outcome

Gaegu was evaluated for `/article/[slug]` and `/craft/[slug]` detail pages,
then reverted before merge because it reduced long-form Korean readability.
Pretendard Variable is now applied as the global sans reading font.

The implementation uses a self-hosted local font file instead of a runtime font
CDN request. Article/Craft detail pages inherit the global `--font-sans`
contract and keep the typography safeguards introduced during the Gaegu
experiment.

## Why Pretendard Replaced The Rollback State

The rollback to the existing sans stack solved readability, but it left Korean
and English rendering split between Inter and platform Korean fallbacks.
Pretendard is a better product typography fit for bendd.me because the site is
mostly Korean technical writing with frequent English terms, numbers, links,
and code-ish tokens.

The chosen direction:

- keeps the handwritten Gaegu experiment out of long-form body text;
- uses Pretendard for Korean/English body rhythm;
- keeps code, tables, controls, and interactive elements isolated;
- keeps font requests same-origin;
- avoids preloading the large CJK variable font into the critical path.

## Implementation

Files:

- `src/app/layout.tsx`
- `src/app/fonts/PretendardVariable.woff2`
- `src/app/fonts/Pretendard-LICENSE.txt`
- `src/components/layout/mdx.tsx`
- `src/components/layout/mdx-layout.module.css`
- `tests/mdx-rendering.spec.ts`
- `docs/conventions.md`
- `docs/font-risk-management.md`

The code:

- loads Pretendard with `next/font/local`;
- maps Pretendard to `--font-sans`;
- sets `display: 'swap'`;
- sets `preload: false` because the CJK variable file is large;
- declares `weight: '100 900'` for variable weight coverage;
- keeps system Korean fallbacks after the generated font family;
- marks detail bodies with `article[data-content-font="pretendard"]`;
- keeps `code/pre/kbd/samp` on `--font-mono`;
- keeps tables and interactive controls on the shared `--content-font-sans`
  stack;
- keeps line-height, Korean line breaking, wrapping, and font-synthesis
  safeguards.

## Tests Kept

The regression tests assert the current font contract:

- Article detail pages use Pretendard and not Gaegu.
- Craft detail pages use the same helper-backed Pretendard contract.
- Runtime font requests must be present before same-origin checks run.
- Runtime font requests stay same-origin.
- Pretendard is not preloaded into the critical path.
- Pretendard `@font-face` is present.
- Gaegu `@font-face` is absent.
- Code does not inherit the prose font when visible.
- Table cells and interactive controls keep the content sans stack.
- Visual MDX text such as captions and DeepDive body text stays in the content
  font.
- Article body line-height remains readable.

## Documentation

`docs/font-risk-management.md` is the source of truth for font-related user
experience risks. It covers readability, FOIT, FOUT, CLS, CJK payload, preload
misuse, third-party requests, glyph fallback, synthetic styles,
code/table/control isolation, visual MDX text, and accessibility preferences.

`docs/conventions.md` links to that document and records the current Pretendard
font policy.

## Verification

Run:

```bash
pnpm check-types
pnpm format:check
pnpm test:unit --run
pnpm build
pnpm exec playwright test tests/mdx-rendering.spec.ts --project=chromium
pnpm exec playwright test tests/accessibility.spec.ts --project=chromium
```

Expected result: all commands pass. Existing unrelated lint warnings in
`pnpm build` may still appear, but the build must exit with code `0`.
