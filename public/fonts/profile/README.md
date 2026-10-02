# Home profile fonts

The home profile uses two locally served WOFF2 subsets. No profile copy is sent
to a font service at build time or in the browser.

| File                  | Original               | Coverage                                    | Size        |
| --------------------- | ---------------------- | ------------------------------------------- | ----------- |
| `profile-serif.woff2` | Noto Serif KR variable | 이재민 and the Korean introductory sentence | 9,256 bytes |
| `profile-dots.woff2`  | Doto variable          | JAEMIN LEE and A PERSONAL WORKSPACE         | 1,636 bytes |

Sources: [Noto Serif KR](https://github.com/google/fonts/tree/main/ofl/notoserifkr)
and [Doto](https://github.com/google/fonts/tree/main/ofl/doto), retrieved
2026-10-01. The corresponding SIL OFL licenses are stored alongside these files.
Both retain the original variable axes and embedded copyright/license metadata.

The public TTF originals were downloaded without transmitting profile text,
then subset locally with the existing `subset-font` dependency and
`preserveNameIds: [0, 13, 14]`. They are not downloaded during regular builds.
If the name or introductory sentence changes, regenerate the serif subset
from the original font with the new text before committing it. The complete
fallback font stack keeps uncovered characters readable.

Original TTF SHA-256:

- Noto Serif KR: `11f8d5de6f1b79195efba3828aaa2ec95c1178f5ae976fb23c8d53250a9938f3`
- Doto: `6f4fe7d37853b91df3698daa84cde2dbe1c9695d88c986e6510134910337d426`
