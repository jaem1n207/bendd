// Manual production-browser audit. No part of this runs during next build.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = process.env.FONT_AUDIT_PLAYWRIGHT
  ? require(process.env.FONT_AUDIT_PLAYWRIGHT)
  : require('@playwright/test');
const [url, output, buildRoot = '.'] = process.argv.slice(2);
if (!url || !output) {
  throw new Error(
    'Usage: node scripts/audit-fonts.mjs URL OUTPUT [BUILD_ROOT]'
  );
}
await mkdir(output, { recursive: true });
const manifest = JSON.parse(
  await readFile(path.join(buildRoot, '.next/prerender-manifest.json'))
);
const routes = [
  ...new Set([
    '/',
    '/article',
    '/craft',
    '/playground/shuffle-letters',
    ...Object.keys(manifest.routes),
  ]),
]
  .filter(
    route =>
      !/\.(xml|txt|png|ico)$/.test(route) &&
      !route.startsWith('/api/') &&
      !route.startsWith('/_') &&
      route !== '/playground/toc-break'
  )
  .sort();
const selected = new Set([
  '/',
  '/article/save-tokens-for-ai-agent',
  '/article/fix-compacting-conversation',
  '/article/enhancing-type-safety-in-mdx-with-reusable-utility-functions',
  '/craft/implement-rauno-style-text-animation',
  '/playground/shuffle-letters',
]);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.FONT_AUDIT_BROWSER,
});
const results = {
  browser: browser.version(),
  routes: [],
  screenshots: [],
  specimens: [],
};

const overrides = process.env.FONT_AUDIT_FONT_OVERRIDE
  ? JSON.parse(
      await readFile(
        path.join(
          process.env.FONT_AUDIT_FONT_OVERRIDE,
          'src/app/fonts/generated-manifest.json'
        )
      )
    )
  : null;
const fontTransfers = new WeakMap();
const cssOverride =
  overrides && process.env.FONT_AUDIT_CSS_OVERRIDE
    ? await readFile(
        path.join(
          process.env.FONT_AUDIT_FONT_OVERRIDE,
          'src/app/fonts/generated.css'
        ),
        'utf8'
      )
    : null;

async function context(viewport, colorScheme = 'light') {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme,
    reducedMotion: 'reduce',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  await ctx.route('**/*', async route => {
    const target = new URL(route.request().url());
    if (target.pathname.endsWith('.gif')) {
      // Native GIF animation is outside the JS clock. Freeze the encoded
      // image's first frame in the audit only; never mask DOM font pixels.
      const response = await route.fetch();
      const frozen = spawnSync(
        process.env.FONT_AUDIT_PYTHON || 'python3',
        [
          '-c',
          'import sys; from PIL import Image; im=Image.open(sys.stdin.buffer); im.seek(0); im.convert("RGBA").save(sys.stdout.buffer,"PNG")',
        ],
        { input: await response.body(), maxBuffer: 32 * 1024 * 1024 }
      );
      if (frozen.status !== 0) {
        throw new Error(frozen.stderr.toString());
      }
      return route.fulfill({ contentType: 'image/png', body: frozen.stdout });
    }
    if (cssOverride && target.pathname.endsWith('.css')) {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['content-encoding'];
      delete headers['content-length'];
      const body = (await response.text()).replace(
        /@font-face\s*\{[^}]*\}/g,
        face => (face.includes('Bendd') ? '' : face)
      );
      return route.fulfill({
        status: response.status(),
        headers,
        contentType: 'text/css',
        body: body + '\n' + cssOverride,
      });
    }
    if (overrides && target.pathname.startsWith('/fonts/optimized/')) {
      const key = target.pathname.match(/\/([^/]+)-(core|extended|symbols)\./);
      const file = overrides.fonts
        .find(font => font.key === key?.[1])
        ?.files.find(file => file.part === key?.[2]);
      if (!file) {
        throw new Error(`No font override for ${target.pathname}`);
      }
      const original =
        process.env.FONT_AUDIT_ORIGINAL_FONTS &&
        overrides.fonts.find(font => font.key === key[1])?.inputs[0].file;
      return route.fulfill({
        contentType: 'font/woff2',
        body: await readFile(
          path.join(
            process.env.FONT_AUDIT_FONT_OVERRIDE,
            ...(original ? [original] : ['public', file.url])
          )
        ),
      });
    }
    if (target.origin !== new URL(url).origin) {
      return route.abort();
    }
    if (target.pathname === '/api/visitor-location') {
      return route.fulfill({ json: { location: null } });
    }
    return route.continue();
  });
  await ctx.addInitScript(() => {
    // IntersectionObserver can restart videos when full-page capture resizes
    // the viewport. Hold the same initial frame, including during that resize.
    HTMLVideoElement.prototype.play = function () {
      this.pause();
      return Promise.resolve();
    };
    let seed = 42;
    Math.random = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  });
  return ctx;
}

async function newPage(ctx) {
  const page = await ctx.newPage();
  const transfers = { pending: [], files: [], errors: [] };
  fontTransfers.set(page, transfers);
  page.on('response', response => {
    if (!/\.(woff2?|ttf|otf)(\?|$)/.test(response.url())) {
      return;
    }
    transfers.pending.push(
      (async () => {
        const body = await response.body();
        const sizes = await response.request().sizes();
        transfers.files.push({
          file: new URL(response.url()).pathname,
          bytes: body.length,
          encodedBytes: sizes.responseBodySize,
          transferBytes: sizes.responseBodySize + sizes.responseHeadersSize,
          status: response.status(),
        });
      })().catch(error => {
        transfers.errors.push({
          message: String(error),
          closed: page.isClosed(),
        });
      })
    );
  });
  if (!page.clock) {
    throw new Error(
      'Deterministic screenshots require Playwright >= 1.45. Set FONT_AUDIT_PLAYWRIGHT to an existing recent installation.'
    );
  }
  await page.clock.install({ time: '2026-11-04T03:00:00Z' });
  await page.clock.pauseAt('2026-11-04T03:00:01Z');
  return page;
}

async function readyFixture(page) {
  await page.evaluate(async () => {
    document.body.getBoundingClientRect();
    await Promise.all(
      [...document.querySelectorAll('p, em, strong')].map(el => {
        const s = getComputedStyle(el);
        return document.fonts.load(
          `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
          el.textContent
        );
      })
    );
    await document.fonts.ready;
  });
  await page.waitForLoadState('networkidle');
}

async function inspect(page) {
  const data = await page.evaluate(() => {
    const groups = new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (
        !el ||
        /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) ||
        !node.textContent.trim()
      ) {
        continue;
      }
      const css = getComputedStyle(el);
      const values = Object.fromEntries(
        [
          'fontFamily',
          'fontSize',
          'fontWeight',
          'fontStyle',
          'fontStretch',
          'fontVariationSettings',
          'fontFeatureSettings',
          'fontVariantNumeric',
          'fontVariantLigatures',
          'fontKerning',
          'fontOpticalSizing',
          'hyphens',
          'textRendering',
        ].map(key => [key, css[key]])
      );
      const key = JSON.stringify(values);
      if (!groups.has(key)) {
        groups.set(key, { ...values, characters: new Set() });
      }
      for (const c of node.textContent) {
        groups.get(key).characters.add(c);
      }
    }
    const faces = [];
    const visit = rules => {
      for (const rule of rules) {
        if (rule instanceof CSSFontFaceRule) {
          faces.push(rule.cssText);
        }
        if (rule.cssRules) {
          visit(rule.cssRules);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules);
      } catch {}
    }
    return {
      preloads: [
        ...document.querySelectorAll('link[rel="preload"][as="font"]'),
      ].map(el => new URL(el.href).pathname),
      resources: performance
        .getEntriesByType('resource')
        .filter(r => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name))
        .map(r => ({
          file: new URL(r.name).pathname,
          bytes: r.encodedBodySize,
          transferBytes: r.transferSize,
          duration: r.duration,
        })),
      groups: [...groups.values()].map(g => ({
        ...g,
        characters: [...g.characters].sort().join(''),
      })),
      faces: [...new Set(faces)],
      failedFonts: [...document.fonts]
        .filter(face => face.status === 'error')
        .map(face => face.family),
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        el => new URL(el.href).pathname
      ),
      contentHashInput:
        document.querySelector('main')?.textContent ||
        document.body.textContent,
    };
  });
  // Clock mocks performance.getEntriesByType(). Network-domain response sizes
  // remain real, and WOFF2 is already compressed (no HTTP recompression here).
  const transfers = fontTransfers.get(page);
  await Promise.all(transfers.pending);
  if (transfers.errors.some(error => !error.closed)) {
    throw new Error(JSON.stringify(transfers.errors));
  }
  data.resources = transfers.files.map(file => ({ ...file }));
  if (
    data.failedFonts.length ||
    data.resources.some(font => font.status >= 400)
  ) {
    throw new Error('Font failed to load');
  }
  return data;
}

async function revealHome(page) {
  const scrollSteps = 100;
  const frameDurationMs = 16;
  const layoutDurationMs = 1000;

  for (let step = 0; step <= scrollSteps; step += 1) {
    await page.evaluate(progress => {
      window.scrollTo(
        0,
        (document.documentElement.scrollHeight - innerHeight) * progress
      );
    }, step / scrollSteps);
    await page.clock.runFor(frameDurationMs);
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(layoutDurationMs);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(layoutDurationMs);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.clock.runFor(frameDurationMs);
}

async function settle(page) {
  await page.evaluate(() => {
    for (const img of document.images) {
      img.loading = 'eager';
    }
  });
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter(img => img.complete)
        .map(img => img.decode().catch(() => {}))
    );
  });
  await page.clock.runFor(10000);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // Freeze video pixels, not text: autoplay decoding uses wall time even with
  // the JS clock paused. Await the same decoded frame at mediaTime 0 in both builds.
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll('video')].map(async video => {
        video.autoplay = false;
        video.removeAttribute('autoplay');
        video.loop = false;
        video.preload = 'auto';
        video.pause();
        if (video.readyState < 2) {
          await new Promise(resolve =>
            video.addEventListener('loadeddata', resolve, { once: true })
          );
        }
        const presented = new Promise(resolve => {
          const check = (_, metadata) => {
            if (metadata.mediaTime === 0) {
              resolve();
            } else {
              video.requestVideoFrameCallback(check);
            }
          };
          video.requestVideoFrameCallback(check);
        });
        await new Promise(resolve => {
          video.addEventListener('seeked', resolve, { once: true });
          video.currentTime = 0;
        });
        await presented;
      })
    );
  });
  // A live WebGL globe has no font pixels. Hide only the canvas, identically in both builds.
  await page.addStyleTag({
    content: 'canvas { visibility: hidden !important; }',
  });
}

try {
  const ctx = await context({ width: 1440, height: 900 });
  for (const route of routes.filter(
    route =>
      !process.env.FONT_AUDIT_ROUTE || route === process.env.FONT_AUDIT_ROUTE
  )) {
    const page = await newPage(ctx);
    const response = await page.goto(new URL(route, url).href);
    if (response.status() !== 200) {
      throw new Error(`${route}: HTTP ${response.status()}`);
    }
    await settle(page);
    const data = await inspect(page);
    data.contentHash = createHash('sha256')
      .update(data.contentHashInput)
      .digest('hex');
    delete data.contentHashInput;
    data.fontBytes = data.resources.reduce((sum, r) => sum + r.bytes, 0);
    data.encodedFontBytes = data.resources.reduce(
      (sum, r) => sum + r.encodedBytes,
      0
    );
    results.routes.push({ route, ...data });
    if (selected.has(route)) {
      if (route === '/') {
        await revealHome(page);
        const rendered = await inspect(page);
        results.routes.at(-1).fullPageFontBytes = rendered.resources.reduce(
          (sum, file) => sum + file.bytes,
          0
        );
        results.routes.at(-1).fullPageResources = rendered.resources;
      }
      const name =
        (route === '/' ? 'home' : route.slice(1).replaceAll('/', '--')) +
        '-1440-light.png';
      await page.screenshot({
        path: path.join(output, name),
        fullPage: true,
        animations: 'disabled',
      });
      results.screenshots.push(name);
    }
    console.log(route, data.fontBytes, data.preloads.length);
    await page.close();
  }
  await ctx.close();
  for (const colorScheme of ['light', 'dark']) {
    const ctx = await context({ width: 390, height: 844 }, colorScheme);
    for (const route of selected) {
      if (
        process.env.FONT_AUDIT_ROUTE &&
        route !== process.env.FONT_AUDIT_ROUTE
      ) {
        continue;
      }
      const page = await newPage(ctx);
      await page.goto(new URL(route, url).href);
      await settle(page);
      if (route === '/') {
        await revealHome(page);
      }
      const name =
        (route === '/' ? 'home' : route.slice(1).replaceAll('/', '--')) +
        `-390-${colorScheme}.png`;
      await page.screenshot({
        path: path.join(output, name),
        fullPage: true,
        animations: 'disabled',
      });
      results.screenshots.push(name);
      await page.waitForLoadState('networkidle');
      await Promise.all(fontTransfers.get(page).pending);
      await page.close();
    }
    await ctx.close();
  }
  // Same injected specimen in both builds: accents absent from today's prose,
  // synthetic italic + bold-inside-italic, fractional weights, and CSS hyphenation.
  const ctx2 = await context({ width: 1440, height: 900 });
  const page = await newPage(ctx2);
  await page.goto(url);
  await settle(page);
  const variables = await page.evaluate(() => {
    const home =
      document.querySelector('[class*="home-studio_page"]') ||
      document.querySelector('main');
    const values = Object.fromEntries(
      [
        '--font-interface-sans',
        '--font-content-sans',
        '--font-mono',
        '--font-home-sans',
        '--font-home-notes',
        '--font-profile-serif',
        '--font-profile-dots',
      ].map(name => [
        name,
        getComputedStyle(home).getPropertyValue(name) ||
          getComputedStyle(document.documentElement).getPropertyValue(name),
      ])
    );
    values['--audit-ui-stack'] = getComputedStyle(document.body).fontFamily;
    values['--audit-home-stack'] = getComputedStyle(home).fontFamily;
    return values;
  });
  await page.evaluate(variables => {
    const host = document.createElement('main');
    Object.assign(host.style, {
      padding: '24px',
      background: 'white',
      color: 'black',
    });
    for (const [name, value] of Object.entries(variables)) {
      host.style.setProperty(name, value);
    }
    for (const variable of Object.keys(variables).filter(name =>
      name.startsWith('--font-')
    )) {
      const h = document.createElement('h2');
      h.textContent = variable;
      h.style.font = '16px sans-serif';
      host.append(h);
      const weights = variable.includes('serif')
        ? [600, 650]
        : variable.includes('dots')
          ? [700]
          : variable.includes('notes')
            ? [400]
            : [
                400,
                450,
                480,
                500,
                520,
                550,
                560,
                570,
                580,
                600,
                610,
                650,
                700,
                740,
                ...(variable.includes('home') ? [] : [800]),
              ];
      for (const weight of weights) {
        const p = document.createElement('p');
        // Use the site's real complete stacks. Testing a bare face with an
        // invented generic fallback tests a different product and can change
        // kerning at missing-character boundaries.
        const family = /interface|content/.test(variable)
          ? 'var(--audit-ui-stack)'
          : variable === '--font-home-sans'
            ? 'var(--audit-home-stack)'
            : variable === '--font-home-notes'
              ? 'var(--font-home-notes),var(--audit-home-stack),sans-serif'
              : variable === '--font-profile-serif'
                ? 'var(--font-profile-serif),AppleMyungjo,Georgia,serif'
                : variable === '--font-profile-dots'
                  ? 'var(--font-profile-dots),var(--font-mono),monospace'
                  : 'var(--font-mono),ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';
        p.style.cssText = `font-family:${family};font-size:17px;font-weight:${weight};line-height:1.9;margin:0;`;
        const boldWeight = variable.includes('serif')
          ? 650
          : variable.includes('notes')
            ? 400
            : 700;
        p.innerHTML = `${weight} AV office fi fl → “quotes” ‘apostrophe’ – — … hyphen‐ café naïve Ångström Āą Ĳ Œ ß × ÷ ÅV Té Wö 한글 가각힣 日本語 中文 <em>italic <strong style="font-weight:${boldWeight}">bold italic</strong></em>`;
        host.append(p);
      }
    }
    const hyphen = document.createElement('p');
    hyphen.lang = 'en';
    hyphen.style.cssText =
      'font-family:var(--audit-ui-stack);hyphens:auto;width:100px';
    hyphen.textContent = 'extraordinary internationalization';
    host.append(hyphen);
    document.body.replaceChildren(host);
  }, variables);
  await readyFixture(page);
  await page.screenshot({
    path: path.join(output, 'specimen.png'),
    fullPage: true,
    animations: 'disabled',
  });
  results.screenshots.push('specimen.png');
  results.specimens.push(await inspect(page));
  for (const role of ['ui', 'home', 'mono']) {
    await page.evaluate(
      ({ variables, role }) => {
        const host = document.createElement('main');
        for (const [name, value] of Object.entries(variables)) {
          host.style.setProperty(name, value);
        }
        host.style.cssText += ';padding:24px;background:white;color:black';
        const family =
          role === 'ui'
            ? 'var(--audit-ui-stack)'
            : role === 'home'
              ? 'var(--audit-home-stack)'
              : 'var(--font-mono),ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';
        const characters =
          Array.from({ length: 0x180 - 0x20 }, (_, i) =>
            String.fromCodePoint(i + 0x20)
          ).join('') +
          (role === 'mono'
            ? ''
            : Array.from({ length: 11172 }, (_, i) =>
                String.fromCodePoint(i + 0xac00)
              ).join(''));
        for (let i = 0; i < characters.length; i += 60) {
          const p = document.createElement('p');
          p.style.cssText = `font: ${role === 'ui' ? 500 : role === 'home' ? 450 : 400} 17px/1.9 ${family};margin:0;white-space:pre-wrap`;
          p.textContent = 'AV ' + characters.slice(i, i + 60) + ': “end” ‐';
          host.append(p);
        }
        document.body.replaceChildren(host);
      },
      { variables, role }
    );
    await readyFixture(page);
    const name = `coverage-${role}.png`;
    await page.screenshot({
      path: path.join(output, name),
      fullPage: true,
      animations: 'disabled',
    });
    results.screenshots.push(name);
  }
  await ctx2.close();
} finally {
  await writeFile(
    path.join(output, 'audit.json'),
    JSON.stringify(results, null, 2) + '\n'
  );
  await browser.close();
}
