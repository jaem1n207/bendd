#!/usr/bin/env python3
"""Manual, offline font generation. Requires scripts/font-requirements.txt.

Run after changing content, component text, font styles, features or upstream fonts.
The Next.js build only serves the checked-in outputs; it never runs this script.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

import fontTools
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont, OverlapMode

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/fonts/optimized'
ASSETS = ROOT / 'src/app/fonts'
CORE = set(range(0x20, 0x7F)) | {0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026, 0x2010}
LATIN = set(range(0x20, 0x180))
# Browser-default shaping is used even without an explicit CSS feature setting.
# chws is default horizontal CJK spacing; tnum is requested in component CSS.
FEATURES = ['ccmp', 'locl', 'rlig', 'liga', 'clig', 'calt', 'kern', 'mark', 'mkmk', 'chws', 'tnum']
HINT_TABLES = ['fpgm', 'prep', 'cvt ', 'hdmx', 'LTSH', 'VDMX', 'gasp']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-root', type=Path, default=ROOT, help='Write diagnostic outputs outside the working tree')
parser.add_argument('--experimental-merge-mono', action='store_true', help='Diagnostic only: known to fail strict Latin pixel equivalence')
parser.add_argument('--limit-axes', action='store_true', help='Diagnostic only: rebases coordinates and fails strict pixel equivalence')
parser.add_argument('--keep-hinting', action='store_true', help='Diagnostic: retain source hinting')
parser.add_argument('--keep-features', action='store_true', help='Diagnostic: retain every source feature')
args = parser.parse_args()
OUT = args.output_root / 'public/fonts/optimized'
ASSETS = args.output_root / 'src/app/fonts'
ASSETS.mkdir(parents=True, exist_ok=True)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def inventory(font):
    return {
        'glyphs': len(font.getGlyphOrder()), 'characters': len(font.getBestCmap()),
        'axes': {a.axisTag: [a.minValue, a.defaultValue, a.maxValue] for a in font['fvar'].axes} if 'fvar' in font else {},
        'features': {t: sorted({r.FeatureTag for r in font[t].table.FeatureList.FeatureRecord})
                     for t in ['GSUB', 'GPOS'] if t in font and font[t].table.FeatureList},
        'hintTables': [t for t in HINT_TABLES if t in font],
        'instructedGlyphs': sum(bool(getattr(font['glyf'][n], 'program', None) and font['glyf'][n].program.getBytecode())
                               for n in font.getGlyphOrder()) if 'glyf' in font else 0,
    }


def unicode_range(codes):
    ranges = []
    for value in sorted(codes):
        if ranges and ranges[-1][1] + 1 == value:
            ranges[-1][1] = value
        else:
            ranges.append([value, value])
    return ','.join(f'U+{a:04X}' + (f'-{b:04X}' if a != b else '') for a, b in ranges)


def rename(font, family):
    # Rename family/PS identifiers, preserving style, platform/language records,
    # and the presence/absence of typographic and variation-prefix name IDs.
    # In particular, never give all three Fira weights the same PS identity.
    replacements = [
        ('Pretendard Variable', 'Bendd Sans'), ('PretendardVariable', 'BenddSans'),
        ('Fira Mono', 'Bendd Mono'), ('FiraMono', 'BenddMono'),
        ('Noto Serif KR', 'Bendd Serif'), ('NotoSerifKR', 'BenddSerif'),
        ('Gaegu', 'BenddNotes'), ('Doto', 'BenddDots'),
    ]
    for record in font['name'].names:
        if record.nameID not in [1, 2, 3, 4, 6, 16, 17, 21, 22, 25]:
            continue
        value = record.toUnicode()
        for old, new in replacements:
            value = value.replace(old, new)
        record.string = value.encode(record.getEncoding())


def make_subset(font, codes, family, extra_glyphs=()):
    options = subset.Options()
    options.hinting = args.keep_hinting
    options.layout_features = ['*'] if args.keep_features else FEATURES
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17, 25]
    options.name_legacy = False
    options.name_languages = [0x409]
    options.recalc_timestamp = False
    options.recalc_unicode_ranges = False
    options.recalc_codepage_ranges = False
    # post format 3 changes CJK rasterization in macOS Chromium even when every
    # outline and advance is identical. Keep the glyph names (post format 2).
    options.glyph_names = True
    options.notdef_outline = True
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=codes, glyphs=extra_glyphs)
    sub.subset(font)
    if extra_glyphs:
        for table in font['cmap'].tables:
            if table.isUnicode():
                table.cmap = {cp: name for cp, name in table.cmap.items() if cp in codes}
    font.recalcBBoxes = False
    if not args.keep_hinting:
        for table in HINT_TABLES:
            if table in font:
                del font[table]
    rename(font, family)
    return font


temporary = tempfile.TemporaryDirectory(prefix='bendd-fonts-')
copy = json.loads(subprocess.check_output(['node', 'scripts/collect-font-characters.mjs', temporary.name], cwd=ROOT))
coverage_overrides = {key: {ord(c) for c in value} for key, value in copy.items()}

# Read source text as well as actual browser observations. The source pass is
# deliberately conservative: it covers hidden/portalled/interactive copy and
# CSS-generated content. Never normalize away a combining character.
sources = sorted(p for directory in ['src', 'content', 'craft'] for p in (ROOT / directory).rglob('*')
                 if p.suffix in ['.ts', '.tsx', '.mdx', '.css'] and '.spec.' not in p.name
                 and p.name not in ['generated.ts', 'generated.css'])
characters = set(''.join(p.read_text() for p in sources))
used = {ord(c) for c in characters} | LATIN | CORE | {0x2010, 0x00AD}
# shuffleLetters generates every modern Hangul syllable, not just article text.
used |= set(range(0xAC00, 0xD7A4))
source_hash = sha(''.join(str(p.relative_to(ROOT)) + '\0' + p.read_text() for p in sources).encode())

fonts = [
    ('content', 'Bendd Content', ['src/app/fonts/PretendardVariable.woff2'], 'swap', '100 900', {'wght': (400, 800)}, 'global'),
    ('interface', 'Bendd Interface', ['src/app/fonts/PretendardVariable.woff2'], 'swap', '100 900', {'wght': (400, 800)}, 'global'),
    ('home', 'Bendd Home', ['src/app/fonts/PretendardVariable.woff2'], 'block', '100 900', {'wght': (400, 740)}, 'home'),
    ('code-ui', 'Bendd Code UI', ['src/app/fonts/PretendardVariable.woff2'], 'swap', '100 900', {'wght': (400, 800)}, 'home'),
    ('notes', 'Bendd Notes', ['public/fonts/gaegu-notes.woff2'], 'block', '400', {}, 'home'),
    ('serif', 'Bendd Serif', ['public/fonts/profile/profile-serif.woff2'], 'block', '200 900', {'wght': (600, 600, 650)}, 'home'),
    ('dots', 'Bendd Dots', ['public/fonts/profile/profile-dots.woff2'], 'block', '100 900', {'wght': 700, 'ROND': 0}, 'home'),
]
for weight in [400, 500, 700]:
    # The browser previously had seven Google unicode ranges per weight. Merge
    # those exact binaries, rather than silently updating to a newer upstream.
    parts = list((ROOT / 'scripts/font-sources/fira').glob(f'{weight}-*.woff2'))
    order = {'latin': 0, 'latin-ext': 1, 'symbols': 2}
    inputs = [str(p.relative_to(ROOT)) for p in sorted(parts, key=lambda p: (order.get(p.stem[len(str(weight)) + 1:], 3), p.name))]
    fonts.append((f'mono-{weight}', 'Bendd Mono', inputs, 'block', str(weight), {}, 'global'))

OUT.mkdir(parents=True, exist_ok=True)
css = ['/* Generated manually by scripts/optimize-fonts.py. Do not edit. */']
preloads = {'global': [], 'home': [], 'homeGlobal': []}
report = {'fontTools': fontTools.__version__, 'sourceHash': source_hash, 'recipeHash': sha(Path(__file__).read_bytes() + (ROOT / 'scripts/collect-font-characters.mjs').read_bytes()), 'fonts': []}
written = set()
by_digest = {}
for key, family, inputs, display, weight, limits, scope in fonts:
    originals = [TTFont(ROOT / p, recalcTimestamp=False) for p in inputs]
    before = [{'file': p, 'bytes': (ROOT / p).stat().st_size, 'sha256': sha((ROOT / p).read_bytes()), **inventory(f)}
              for p, f in zip(inputs, originals)]
    if key.startswith('mono-') and not args.experimental_merge_mono:
        # Preserve the original Unicode slice boundaries and native font data.
        # Subsetting/merging changed Latin pixels despite equal outline geometry.
        legacy_ranges = json.loads((ROOT / 'scripts/font-sources/fira/ranges.json').read_text())
        license_data = (ROOT / 'scripts/font-sources/fira/OFL.txt').read_bytes()
        license_name = f'license-{sha(license_data)[:12]}.txt'
        (OUT / license_name).write_bytes(license_data); written.add(license_name)
        entry = {'key': key, 'family': family, 'stack': f'"{family}"', 'display': display, 'cssWeight': weight,
                 'usedAxisLimits': {}, 'inputs': before, 'files': [], 'licenseUrl': f'/fonts/optimized/{license_name}',
                 'exception': 'Retain original Latin/Latin-ext/symbols slices and hinting policy for pixel equivalence'}
        parts = [('extended', 'latin-ext')] + ([('symbols', 'symbols')] if key == 'mono-400' else []) + [('core', 'latin')]
        for part, kind in parts:
            source = ROOT / f'scripts/font-sources/fira/{weight}-{kind}.woff2'
            binary = source.read_bytes()
            face = TTFont(io.BytesIO(binary), recalcTimestamp=False, recalcBBoxes=False)
            if part == 'core':
                # Old Google's broad Latin CSS range substituted this missing
                # hyphen with ASCII '-'. Preserve that behavior with a real cmap.
                for table in face['cmap'].tables:
                    if table.isUnicode(): table.cmap[0x2010] = face.getBestCmap()[0x2D]
                data = io.BytesIO(); face.save(data); binary = data.getvalue()
            actual = set(face.getBestCmap())
            allowed = set()
            for segment in legacy_ranges[source.name].split(','):
                value = segment.removeprefix('U+')
                if '?' in value:
                    a, b = int(value.replace('?', '0'), 16), int(value.replace('?', 'F'), 16)
                elif '-' in value:
                    a, b = (int(v, 16) for v in value.split('-'))
                else: a = b = int(value, 16)
                allowed.update(range(a, b + 1))
            advertised = actual & allowed
            assert advertised <= actual
            name = f'{key}-{part}.{sha(binary)[:12]}.woff2'
            (OUT / name).write_bytes(binary); written.add(name)
            checked = TTFont(io.BytesIO(binary), checkChecksums=2)
            assert set(checked.getBestCmap()) == actual
            href = f'/fonts/optimized/{name}'; ranges = unicode_range(advertised)
            css.append(f'@font-face {{ font-family: "{family}"; src: url("{href}") format("woff2"); font-display: {display}; font-weight: {weight}; font-style: normal; unicode-range: {ranges}; }}')
            entry['files'].append({'part': part, 'url': href, 'bytes': len(binary), 'sha256': sha(binary),
                'unicodeRange': ranges, 'unadvertisedShapingCharacters': unicode_range(actual - advertised), **inventory(checked)})
            if part == 'core':
                preloads['global'].append(href)
                if key == 'mono-400': preloads['homeGlobal'].append(href)
        report['fonts'].append(entry)
        print(key, sum(f['bytes'] for f in before), '->', sum(f['bytes'] for f in entry['files']))
        continue
    if len(inputs) > 1:
        # Keep only requested characters before merging to avoid unnecessary
        # duplicate glyphs/layout tables, but retain all default shaping.
        buffers = []
        seen = set()
        for original in originals:
            codes = (set(original.getBestCmap()) & used) - seen
            if not codes:
                continue
            # Preserve the source face's encoded combining marks. They affect
            # Unicode normalization/shaping even in precomposed Latin text.
            codes |= {cp for cp in original.getBestCmap() if unicodedata.category(chr(cp)).startswith('M')} - seen
            seen |= codes
            make_subset(original, codes, family)
            original.flavor = None
            buf = io.BytesIO(); original.save(buf); buf.seek(0); buffers.append(buf)
        font = Merger().merge(buffers)
        if font['OS/2'].version == 3 and font['OS/2'].fsSelection & 0x380:
            font['OS/2'].version = 4
        font.recalcTimestamp = False
        font.recalcBBoxes = False
        font['head'].created = originals[0]['head'].created
        font['head'].modified = originals[0]['head'].modified
    elif key in ['home', 'interface']:
        font = TTFont(Path(temporary.name) / f'{key}.woff2', recalcTimestamp=False)
    else:
        font = originals[0]
    # Chromium's original unrestricted local faces (and Google's broad Latin
    # range) resolve missing U+2010 to their ASCII hyphen before family fallback.
    # Encode that existing alias explicitly: exact unicode-range declarations
    # would otherwise send it to a different font and change pixels/line wraps.
    cmap = font.getBestCmap()
    if 0x2010 not in cmap and 0x2D in cmap:
        for table in font['cmap'].tables:
            if table.isUnicode():
                table.cmap[0x2010] = cmap[0x2D]
    available = set(font.getBestCmap())
    marks = {cp for cp in available if unicodedata.category(chr(cp)).startswith('M')}
    coverage = available & (coverage_overrides.get(key, used) | {0x2010} | (LATIN | CORE if key == 'code-ui' else set())) | marks
    # NFD characters are implicit shaping inputs, not just literal text. In
    # particular retain Latin accents and the Jamo used to shape Hangul.
    coverage |= {ord(c) for cp in coverage for c in unicodedata.normalize('NFD', chr(cp))} & available
    core = available & CORE
    if key.startswith('mono-'):
        # Preserve Google's original Latin-face normalization boundary.
        core |= set(originals[0].getBestCmap()) & coverage
    # Preserve existing UI/home coverage, including their CJK fallback contract.
    # Latin additions are limited to glyphs already present in the input font.
    if key == 'dots' and not args.limit_axes:
        font = instantiateVariableFont(font, {'ROND': 0}, inplace=True, optimize=False, overlap=OverlapMode.KEEP_AND_DONT_SET_FLAGS)
    if limits and args.limit_axes:
        font = instantiateVariableFont(font, limits, inplace=True, optimize=True, overlap=OverlapMode.KEEP_AND_DONT_SET_FLAGS)
        if 'wght' in limits:
            limit = limits['wght']
            weight = str(limit) if isinstance(limit, (int, float)) else f'{limit[0]} {limit[-1]}'
    stack = f'"{family}"'
    license_path = 'src/app/fonts/Pretendard-LICENSE.txt' if key in ['content', 'interface', 'home', 'code-ui'] else 'scripts/font-sources/fira/OFL.txt' if key.startswith('mono-') else {'notes': 'public/fonts/Gaegu-OFL.txt', 'serif': 'public/fonts/profile/profile-serif-OFL.txt', 'dots': 'public/fonts/profile/profile-dots-OFL.txt'}[key]
    license_data = (ROOT / license_path).read_bytes()
    license_name = f'license-{sha(license_data)[:12]}.txt'
    (OUT / license_name).write_bytes(license_data)
    written.add(license_name)
    entry = {'licenseUrl': f'/fonts/optimized/{license_name}', 'key': key, 'family': family, 'stack': stack, 'display': display, 'cssWeight': weight, 'usedAxisLimits': limits, 'inputs': before, 'files': []}
    # Keep the existing UI subset intact: splitting its mixed-script kerning
    # pairs changes native pixels. Other roles have core/extended families,
    # both ahead of the original fallback. Extended carries core shaping helpers.
    for part, codes in ([('core', coverage)] if key == 'interface' else [('extended', coverage - core), ('core', coverage & core)]):
        if not codes:
            # A source with only ASCII (Doto) has no extended glyphs to fetch.
            continue
        buf = io.BytesIO(); font.flavor = None; font.save(buf); buf.seek(0)
        helper = core if part == 'extended' and not key.startswith('mono-') else set()
        result = make_subset(TTFont(buf, recalcTimestamp=False), codes | helper, family,
                             [font.getBestCmap()[cp] for cp in marks] if part == 'core' and key.startswith('mono-') else [])
        result.flavor = 'woff2'
        data = io.BytesIO(); result.save(data); binary = data.getvalue()
        name = by_digest.setdefault(sha(binary), f'{key}-{part}.{sha(binary)[:12]}.woff2')
        (OUT / name).write_bytes(binary); written.add(name)
        # Re-open generated binaries: WOFF2 transformations and fontTools merging
        # can change cmap contents. CSS ranges must come from the actual output.
        checked = TTFont(io.BytesIO(binary))
        actual = set(checked.getBestCmap())
        assert actual == codes | helper, (key, part, actual ^ (codes | helper))
        assert not (set(inventory(checked)['hintTables']) - set(before[0]['hintTables']))
        if not args.keep_hinting:
            assert not inventory(checked)['hintTables'] and not inventory(checked)['instructedGlyphs']
        ranges = unicode_range(actual)
        href = f'/fonts/optimized/{name}'
        css.append(f'@font-face {{ font-family: "{family}"; src: url("{href}") format("woff2"); font-display: {display}; font-weight: {weight};' +
                   (' font-style: normal;' if key.startswith('mono-') else '') + f' unicode-range: {ranges}; }}')
        entry['files'].append({'part': part, 'url': href, 'bytes': len(binary), 'sha256': sha(binary), 'unicodeRange': ranges, **inventory(checked)})
        if part == 'core' and href not in preloads['global'] and href not in preloads[scope]:
            preloads[scope].append(href)
            if key == 'interface': preloads['homeGlobal'].append(href)
    report['fonts'].append(entry)
    print(key, sum(f['bytes'] for f in before), '->', sum(f['bytes'] for f in entry['files']))

# Identical fallback ordering, local font and metrics to the original generated
# baseline Next.js CSS. Both Unicode subsets precede the fallback face.
css += [
    '@font-face { font-family: "Bendd Content Fallback"; src: local("Arial"); ascent-override: 93.76%; descent-override: 23.75%; line-gap-override: 0.00%; size-adjust: 101.55%; }',
    '@font-face { font-family: "Bendd Mono Fallback"; src: local("Arial"); ascent-override: 69.47%; descent-override: 19.69%; line-gap-override: 0.00%; size-adjust: 134.59%; }',
    '.font-global { --font-sans: var(--font-interface-sans), var(--font-content-sans); --font-content-sans: "Bendd Content", "Bendd Content Fallback", system-ui, Apple SD Gothic Neo, Malgun Gothic, sans-serif; --font-interface-sans: "Bendd Interface"; --font-mono: "Bendd Mono", "Bendd Mono Fallback"; }',
    '.font-home [data-code-walkthrough] { --font-sans: var(--font-interface-sans), \"Bendd Code UI\", var(--font-content-sans); }',
    '.font-home { --font-home-sans: "Bendd Home"; --font-home-notes: "Bendd Notes"; --font-profile-serif: "Bendd Serif"; --font-profile-dots: "Bendd Dots"; }',
]
for p in list(OUT.glob('*.woff2')) + list(OUT.glob('license-*.txt')):
    if p.name not in written:
        p.unlink()
(ASSETS / 'generated.css').write_text('\n'.join(css) + '\n')
(ASSETS / 'generated.ts').write_text('// Generated manually by scripts/optimize-fonts.py.\n' +
    'export const fontPreloads = ' + json.dumps(preloads, indent=2) + ' as const;\n')
(ASSETS / 'generated-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

# Keep generated TypeScript valid under the repository format gate.
subprocess.run(['node', str(ROOT / 'node_modules/prettier/bin/prettier.cjs'), '--config', str(ROOT / '.prettierrc'), '--write', str(ASSETS / 'generated.ts')], cwd=ROOT, check=True)
