# Globe land mask

`land-mask.png` is the equirectangular land texture bundled with COBE 2.0.1
(https://github.com/shuding/cobe). It is redistributed unchanged under its MIT
license; see `LICENSE-cobe.txt`.

The renderer samples this mask once at equally distributed sphere positions.
Continental color regions are visual groupings, not political boundaries.
No visitor information is encoded in the asset.

`seoul-avatar.png` is the unchanged PNG payload embedded in this repository's
`src/app/favicon.ico`. Inline markers use PNG so image decoding does not share
the browser favicon loading path; the existing rabbit artwork is preserved.
