---
name: bendd-visual-article-polish
description: Polish visual-heavy bendd.me MDX articles. Use for long craft/article posts with screenshots, SVGs, GIFs, image zoom, TOC layout, DeepDive/VisualStack sections, captions, spacing, mobile readability, and unused visual asset cleanup.
---

# Bendd Visual Article Polish

Use this after the content direction is mostly settled and the article needs visual structure, readability, and QA polish.

## Review Order

1. Read the target MDX and the MDX components it uses.
2. Inspect provided screenshots or local image files with `view_image` when visual judgment matters.
3. Check `src/mdx/custom-mdx.tsx` to confirm component registration.
4. Inspect `src/mdx/components/zoom-image`, `deep-dive`, `visual-stack`, TOC, and layout CSS when the issue involves images, captions, or section spacing.

## Visual Placement

- Put visual material immediately after the paragraph that explains why the reader needs it.
- Prefer real UI screenshots when the article is about actual product behavior.
- Use GIFs for motion, but pair them with a static image or diagram when the intent is not obvious from motion alone.
- Give every media item useful `alt`, `caption`, `width`, and `height` values.
- Keep caption text visible when zoomed; large images must not hide `.zoom-image_caption__*`.
- Make images clickable/zoomable consistently across normal MDX images, `VisualStack`, and `DeepDive` media.

## Deep Dive Readability

- Do not minimize UX sections by deleting meaningful reasoning.
- Preserve the chain: user situation -> design choice -> user effect.
- Keep state feedback, automation, control, exception handling, and recovery behavior concrete.
- Avoid exposing internal section labels such as `UX Deep Dive:` when the user asks for reader-facing prose.
- Use spacing to separate sections, not decorative clutter. In this repo, a compact DeepDive gap can be better than repeated divider lines.

## Layout Checks

Check for:

- TOC too narrow or over-truncated on wide screens
- list item dates wrapping awkwardly
- button/card text overflow
- figcaption clipped by zoomed images
- SVG text clipped by viewBox bounds
- DeepDive media rendering too large relative to body text
- mobile image grids that should stack

## Asset Hygiene

Before deleting assets, compare the article references and files on disk:

```bash
rg -n "/images/<slug>/[^\"\\) ]+" craft content src
rg --files public/images/<slug>
```

Delete only files that are clearly unreferenced and not intentionally reserved for the article. If all files are referenced, report that there is no cleanup target.

## Verification

Run:

```bash
pnpm check-types
pnpm lint
pnpm exec vitest run <focused specs>
pnpm build
```

When layout changed, also inspect the page in desktop and mobile viewports with screenshots. Do not claim visual polish is complete without looking at the rendered result when a browser or screenshot is available.
