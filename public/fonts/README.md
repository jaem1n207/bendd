# Home margin notes

`gaegu-notes.woff2` is a 10,684-byte, regular-weight subset of
[Gaegu](https://fonts.google.com/specimen/Gaegu), provided by Google Fonts.
The upstream license is included in `Gaegu-OFL.txt`.

It contains the characters used in these short home annotations:

- 내가 쓰려고 만든 도구
- 안에서 스크롤해 보세요
- 글자를 눌러 섞어 보세요
- 만들며 배운 걸 기록합니다.

`HomeStudio` loads this face with `next/font/local`, using the
`--font-home-notes` variable. It is served from this site's own origin with
`font-display: block` and a home-route-only preload, so the small annotations
do not briefly appear in a different font. Body text and controls continue to
use Pretendard. Regenerate the text subset when changing these annotations;
missing characters otherwise use the sans fallback.

Source: the Google Fonts CSS API, `family=Gaegu:wght@400`, `display=swap`,
and the `text` parameter containing the annotation characters above. The
returned TrueType subset is converted locally to WOFF2 with the existing
`subset-font` dependency, preserving copyright and license name records.
