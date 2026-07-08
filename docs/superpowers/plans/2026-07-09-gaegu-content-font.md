# Content Font Experiment And Rollback Plan

## Outcome

Gaegu was evaluated for `/article/[slug]` and `/craft/[slug]` detail pages, then reverted before merge.

The final implementation does not use Gaegu or any Article/Craft-specific custom content font. It keeps the existing `--font-sans` reading font and preserves the font risk safeguards introduced during the experiment.

## Why The Rollback Happened

The handwritten look matched the original visual direction, but the real page showed a sharper product problem:

- long Korean paragraphs became harder to scan;
- title and TL;DR looked expressive, but body text became visually noisy;
- mixed Korean, English, code-ish tokens, emoji, and links lost rhythm;
- the readability loss outweighed the emotional gain.

The site publishes long-form technical writing. Body typography must optimize reading, not decoration.

## Final Implementation

Files:

- `src/components/layout/mdx.tsx`
- `src/components/layout/mdx-layout.module.css`
- `tests/mdx-rendering.spec.ts`
- `docs/conventions.md`
- `docs/font-risk-management.md`

The final code:

- removes the `Gaegu` import from `next/font/google`;
- removes the content-specific font loader and CSS variable;
- marks the detail body with `article[data-content-font="system"]`;
- keeps Article/Craft text on `var(--font-sans), system-ui, sans-serif`;
- keeps `code/pre/kbd/samp` on `var(--font-mono)`;
- keeps tables and interactive controls on the existing sans UI font;
- keeps line-height, Korean line breaking, wrapping, and font-synthesis safeguards.

## Tests Kept

The regression tests no longer assert that Gaegu is present. They assert the safer long-term contract:

- Article detail pages use the existing sans content font.
- Craft detail pages use the same contract.
- Gaegu `@font-face` rules are absent.
- Runtime font requests stay same-origin.
- Code does not inherit the prose font.
- Visual MDX text such as captions and DeepDive body text stays in the content font.
- Article body line-height remains readable.

## Documentation

`docs/font-risk-management.md` is the source of truth for font-related user experience risks. It covers readability, FOIT, FOUT, CLS, CJK payload, preload misuse, third-party requests, glyph fallback, synthetic styles, code/table/control isolation, visual MDX text, and accessibility preferences.

`docs/conventions.md` links to that document and records the current Article/Craft font policy.

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

Expected result: all commands pass. Existing unrelated lint warnings in `pnpm build` may still appear, but the build must exit with code `0`.
