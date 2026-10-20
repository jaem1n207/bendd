# Home margin notes

`gaegu-notes.woff2` is an 11,068-byte, regular-weight subset of
[Gaegu](https://fonts.google.com/specimen/Gaegu), provided by Google Fonts.
The upstream license is included in `Gaegu-OFL.txt`.

It contains the characters used in these short home annotations:

- 내가 쓰려고 만든 도구
- 글자를 눌러 섞어 보세요
- 도구를 눌러 보세요
- 설명과 코드를 읽어 보세요
- 만들며 배운 걸 기록합니다.

`HomeStudio` loads this face with `next/font/local`, using the
`--font-home-notes` variable. It is served from this site's own origin with
`font-display: block` and a home-route-only preload, so the small annotations
do not briefly appear in a different font. Body text and controls continue to
use Pretendard. Missing characters otherwise use the sans fallback, mixing
two typefaces inside a single word and changing its line breaks.

Regenerate with `node scripts/generate-margin-note-font.mjs` after editing
`MarginNote` text. The script extracts all current annotations from
`HomeStudio`, downloads the official
[Gaegu Regular source](https://github.com/google/fonts/blob/main/ofl/gaegu/Gaegu-Regular.ttf),
and subsets it locally with the existing `subset-font` dependency. It preserves
copyright and license records. This explicit maintenance command needs network
access; ordinary builds keep using the committed local WOFF2.

`tests/margin-note-font.spec.ts` checks the actual rendered font through Chromium
CDP and checks each phrase's line count in Chromium and WebKit.
