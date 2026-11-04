#!/usr/bin/env python3
"""Strict RGBA pixel comparison. Never mask text or accept a perceptual threshold."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('before', type=Path)
parser.add_argument('after', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
before = json.loads((args.before / 'audit.json').read_text())
after = json.loads((args.after / 'audit.json').read_text())
assert before['browser'] == after['browser'], 'Browser versions differ'
assert {r['route']: r['contentHash'] for r in before['routes']} == {r['route']: r['contentHash'] for r in after['routes']}, 'Page content changed'
assert before['screenshots'] == after['screenshots'], 'Screenshot sets differ'
for filename in before['screenshots']:
    (args.output / filename).unlink(missing_ok=True)
results = []
for filename in before['screenshots']:
    a = Image.open(args.before / filename).convert('RGBA')
    b = Image.open(args.after / filename).convert('RGBA')
    result = {'file': filename, 'beforeSize': a.size, 'afterSize': b.size}
    if a.size != b.size:
        result['dimensionMismatch'] = True
    else:
        diff = ImageChops.difference(a, b)
        channels = diff.split()
        maximum = channels[0]
        for channel in channels[1:]:
            maximum = ImageChops.lighter(maximum, channel)
        histogram = maximum.histogram()
        changed = a.width * a.height - histogram[0]
        result.update(pixels=changed, totalPixels=a.width * a.height, boundingBox=maximum.getbbox(), maxChannelDelta=next((i for i in range(255, -1, -1) if histogram[i]), 0))
        if changed:
            # Red = every changed pixel, including antialiasing; no tolerance.
            mask = maximum.point(lambda v: 255 if v else 0)
            overlay = a.copy(); overlay.paste((255, 0, 0, 255), mask=mask)
            overlay.save(args.output / filename)
    results.append(result)
    print(filename, result.get('pixels', 'DIMENSIONS'), result.get('boundingBox'))
(args.output / 'pixels.json').write_text(json.dumps(results, indent=2) + '\n')
raise SystemExit(1 if any(r.get('pixels', 0) or r.get('dimensionMismatch') for r in results) else 0)
