# Pretendard fonts

`PretendardVariable.woff2` is the original full-coverage variable font. Its
license is in `Pretendard-LICENSE.txt`. Article and Craft pages continue to
load this file without preloading the roughly 2 MB payload.

`PretendardHome.woff2` is generated from that original file by
`scripts/generate-home-font.mjs`. It preserves the weight axis (100–900),
glyph outlines, metrics, and embedded license metadata. It includes printable
ASCII, home, profile, and shared Dock component text (including interaction states), site metadata, and
article frontmatter so any featured title or summary is covered. Article bodies
are excluded. The original home subset was 90,912 bytes; the current home and
profile, Tech Stack, code walkthrough, and Dock copy produces 105,296 bytes.

Run `pnpm fonts:home` after editing home copy while the dev server is running.
`pnpm dev` and `pnpm build` regenerate the subset before starting Next.js.
Generation is local and deterministic; unchanged output is not rewritten.
Commit the generated WOFF2 alongside source changes. Do not edit it manually.

`HomeStudio` uses a home-only `next/font/local` preload and `display: 'block'`
to avoid rendering fallback text before the small font is ready. Uncovered
characters retain the full Pretendard/system fallback stack. This is a bounded
browser font block period, not JavaScript that hides the page; unusually slow
or failed requests still fall back to readable text.

The profile's small serif and dot typefaces are separate home-only local
subsets. Their sources, coverage, and licenses are documented in
`public/fonts/profile/README.md`.
