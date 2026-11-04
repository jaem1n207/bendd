// Manual network check for the production build, including pages with no
// extended characters. Each probe has a fresh browser cache.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = process.env.FONT_AUDIT_PLAYWRIGHT
  ? require(process.env.FONT_AUDIT_PLAYWRIGHT)
  : require('@playwright/test');
const [origin, output] = process.argv.slice(2);
if (!origin || !output) {
  throw new Error('Usage: node scripts/check-font-delivery.mjs URL OUTPUT');
}
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  await readFile(path.join(root, 'src/app/fonts/generated-manifest.json'))
);
const css = await readFile(
  path.join(root, 'src/app/fonts/generated.css'),
  'utf8'
);
const browser = await chromium.launch({
  executablePath: process.env.FONT_AUDIT_BROWSER,
});
const results = [];

function codes(range) {
  return range.split(',').flatMap(part => {
    const [a, b = a] = part
      .slice(2)
      .split('-')
      .map(value => parseInt(value, 16));
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });
}

try {
  for (const font of manifest.fonts) {
    const core = font.files.find(f => f.part === 'core');
    const coreCodes = new Set(codes(core.unicodeRange));
    const probes = [{ part: 'core', character: '' }];
    for (const file of font.files.filter(file => file.part !== 'core')) {
      const exclusive = codes(file.unicodeRange).filter(
        cp => !coreCodes.has(cp)
      );
      probes.push({
        part: file.part,
        character: String.fromCodePoint(
          exclusive.find(cp =>
            /[\p{L}\p{N}]/u.test(String.fromCodePoint(cp))
          ) ?? exclusive[0]
        ),
      });
    }
    for (const { part, character } of probes) {
      const extra = font.files.find(file => file.part === part);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.route('**/__font_probe', route =>
        route.fulfill({
          contentType: 'text/html',
          body: `<!doctype html><meta charset="utf-8"><style>${css}</style><p style='font-family:${font.stack};font-weight:${font.cssWeight.split(' ')[0]};font-size:24px'>ASCII core . 0123 ${character}</p>`,
        })
      );
      await page.goto(new URL('/__font_probe', origin).href);
      await page.evaluate(() => document.fonts.ready);
      const files = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter(r => r.name.endsWith('.woff2'))
          .map(r => new URL(r.name).pathname)
      );
      assert.deepEqual(
        [...files].sort(),
        [core.url, ...(part !== 'core' ? [extra.url] : [])].sort(),
        `${font.key}: part=${part}`
      );
      results.push({
        font: font.key,
        part,
        character: character || null,
        files,
      });
      console.log(font.key, part, files.length, 'PASS');
      await context.close();
    }
  }
} finally {
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'delivery.json'),
    JSON.stringify(results, null, 2) + '\n'
  );
  await browser.close();
}
