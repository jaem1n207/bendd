// 수동 production 비교. Playwright route/Clock을 쓰지 않아 HTTP 캐시와 실제 시계를 보존한다.
import { createRequire } from 'node:module';
import os from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.FONT_AUDIT_PLAYWRIGHT || '@playwright/test'
);
const OUT = process.argv[2] || 'output/playwright/font-optimization/timing';
const ROUNDS = Number(process.env.FONT_BENCH_ROUNDS || 5);
const WINDOW_MS = 7000;
const LATENCY_MS = 40;
const DOWNLOAD_BPS = 1250000;
const UPLOAD_BPS = 125000;
const CPU_RATE = 4;
const HTTP_OK = 200;
const HTTP_ERROR_START = 400;
const defaultRoutes = [
  '/',
  '/article/naming-tokens-in-design',
  '/playground/shuffle-letters',
];
const routes = process.env.FONT_BENCH_ROUTE
  ? [process.env.FONT_BENCH_ROUTE]
  : defaultRoutes;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
});
let previous;
try {
  previous = JSON.parse(await readFile(`${OUT}/samples.json`, 'utf8'));
} catch {}
const buildIds = {};
for (const [variant, directory] of Object.entries({
  before: process.env.FONT_BENCH_BASELINE_ROOT,
  after: process.cwd(),
})) {
  if (!directory) {
    continue;
  }
  try {
    buildIds[variant] = (
      await readFile(`${directory}/.next/BUILD_ID`, 'utf8')
    ).trim();
  } catch {}
}
const report = {
  buildIds,
  source: previous?.source,
  browser: browser.version(),
  environment: previous?.environment || {
    platform: os.platform(),
    release: os.release(),
    cpu: os.cpus()[0].model,
    measuredAt: new Date().toISOString(),
  },
  conditions: {
    routes,
    viewport: '1440x900 DPR1',
    latencyMs: LATENCY_MS,
    downloadBps: DOWNLOAD_BPS,
    uploadBps: UPLOAD_BPS,
    cpuRate: CPU_RATE,
    windowMs: WINDOW_MS,
    rounds: ROUNDS,
    settling:
      'Observe at least 7s and wait up to 30s for loaded fonts and two frames; resume complete pairs without rerunning them',
    external:
      'DNS blocked; visitor location stubbed using CDP Fetch; no Playwright routing',
    cache:
      'cold=new context; warm=new page in same context after cold visit; HTTP cache enabled',
    fontMetric:
      'DOMContentLoaded then document.fonts.ready + two requestAnimationFrame callbacks; readiness proxy, not direct glyph paint timestamp',
  },
  samples: previous?.samples || [],
};
try {
  if (previous) {
    if (previous.browser !== report.browser) {
      throw new Error('Use a new output directory for a different browser');
    }
    for (const key of [
      'latencyMs',
      'downloadBps',
      'uploadBps',
      'cpuRate',
      'windowMs',
      'rounds',
    ]) {
      if (previous.conditions[key] !== report.conditions[key]) {
        throw new Error('Use a new output directory for different conditions');
      }
    }
    for (const [variant, id] of Object.entries(buildIds)) {
      if (previous.buildIds?.[variant] && previous.buildIds[variant] !== id) {
        throw new Error('Use a new output directory for a different build');
      }
    }
    if (
      previous.conditions.routes &&
      JSON.stringify(previous.conditions.routes) !== JSON.stringify(routes)
    ) {
      throw new Error('Use a new output directory for different routes');
    }
  }
  for (let round = 0; round < ROUNDS; round += 1) {
    for (const route of routes) {
      for (const variant of round % 2
        ? ['after', 'before']
        : ['before', 'after']) {
        if (
          report.samples.some(
            row =>
              row.round === round &&
              row.route === route &&
              row.variant === variant &&
              row.cache === 'warm'
          )
        ) {
          continue;
        }
        const port = variant === 'before' ? 3140 : 3141;
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1,
          locale: 'ko-KR',
          timezoneId: 'Asia/Seoul',
          colorScheme: 'light',
          reducedMotion: 'no-preference',
          serviceWorkers: 'block',
        });
        await context.addInitScript(() => {
          let seed = 42;
          Math.random = () =>
            (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
          const metrics = {
            lcp: null,
            lcpElement: null,
            cls: 0,
            fontReady: null,
          };
          window.__fontBench = metrics;
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              metrics.lcp = entry.startTime;
              metrics.lcpElement = entry.element?.outerHTML.slice(0, 350);
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                metrics.cls += entry.value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
          addEventListener(
            'DOMContentLoaded',
            async () => {
              await document.fonts.ready;
              metrics.fontLoadEnd = performance.now();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  metrics.fontReady = performance.now();
                })
              );
            },
            { once: true }
          );
        });
        for (const cache of ['cold', 'warm']) {
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: LATENCY_MS,
            downloadThroughput: DOWNLOAD_BPS,
            uploadThroughput: UPLOAD_BPS,
            connectionType: 'wifi',
          });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
          await cdp.send('Fetch.enable', {
            patterns: [{ urlPattern: '*://localhost:*/api/visitor-location*' }],
          });
          cdp.on('Fetch.requestPaused', event =>
            cdp
              .send('Fetch.fulfillRequest', {
                requestId: event.requestId,
                responseCode: HTTP_OK,
                responseHeaders: [
                  { name: 'Content-Type', value: 'application/json' },
                ],
                body: Buffer.from('{"location":null}').toString('base64'),
              })
              .catch(() => {})
          );
          const requests = new Map();
          cdp.on('Network.requestWillBeSent', event =>
            requests.set(event.requestId, {
              url: event.request.url,
              type: event.type,
              bytes: 0,
              cached: false,
            })
          );
          cdp.on('Network.responseReceived', event => {
            const row = requests.get(event.requestId);
            if (row) {
              row.status = event.response.status;
              row.cached =
                row.cached ||
                !!(
                  event.response.fromDiskCache ||
                  event.response.fromPrefetchCache
                );
            }
          });
          cdp.on('Network.requestServedFromCache', event => {
            const row = requests.get(event.requestId);
            if (row) {
              row.cached = true;
            }
          });
          cdp.on('Network.loadingFinished', event => {
            const row = requests.get(event.requestId);
            if (row) {
              row.bytes = event.encodedDataLength;
              row.finished = true;
            }
          });
          const response = await page.goto(`http://localhost:${port}${route}`, {
            waitUntil: 'domcontentloaded',
          });
          if (response.status() !== HTTP_OK) {
            throw new Error(`${route}: ${response.status()}`);
          }
          await page.waitForFunction(
            windowMs => performance.now() >= windowMs,
            WINDOW_MS
          );
          await page.waitForFunction(
            () =>
              window.__fontBench.fontReady !== null &&
              document.fonts.status === 'loaded',
            null,
            { timeout: 30000 }
          );
          const metrics = await page.evaluate(() => ({
            ...window.__fontBench,
            fcp:
              performance.getEntriesByName('first-contentful-paint')[0]
                ?.startTime ?? null,
            ttfb: performance.getEntriesByType('navigation')[0].responseStart,
            fontsLoaded: document.fonts.status,
            failedFonts: [...document.fonts]
              .filter(face => face.status === 'error')
              .map(face => face.family),
            fontResources: performance
              .getEntriesByType('resource')
              .filter(r => /\.(woff2?|ttf)(\?|$)/.test(r.name))
              .map(r => ({
                url: new URL(r.name).pathname,
                transferBytes: r.transferSize,
                bodyBytes: r.encodedBodySize,
                end: r.responseEnd,
              })),
          }));
          if (
            metrics.fontReady === null ||
            metrics.lcp === null ||
            metrics.fontsLoaded !== 'loaded'
          ) {
            throw new Error(`Incomplete metrics: ${JSON.stringify(metrics)}`);
          }
          const list = [...requests.values()].filter(r =>
            r.url.startsWith(`http://localhost:${port}/`)
          );
          const fonts = list.filter(r => r.type === 'Font');
          if (
            metrics.failedFonts.length ||
            fonts.some(font => font.status >= HTTP_ERROR_START)
          ) {
            throw new Error('A webfont failed; timings are invalid');
          }
          const sample = {
            round,
            route,
            variant,
            cache,
            ...metrics,
            fontNetworkEnd: Math.max(
              0,
              ...metrics.fontResources.map(resource => resource.end)
            ),
            requests: list.length,
            networkRequests: list.filter(r => !r.cached).length,
            fontRequests: fonts.length,
            cachedFontRequests: fonts.filter(r => r.cached).length,
            transferBytes: list.reduce((n, r) => n + r.bytes, 0),
            fontTransferBytes: fonts.reduce((n, r) => n + r.bytes, 0),
          };
          if (route.includes('shuffle-letters')) {
            const actionStart = await page.evaluate(() => performance.now());
            await page.locator('button[type="submit"]').click();
            await page.waitForFunction(
              () =>
                document.querySelector('button[type="submit"]')?.disabled ===
                false
            );
            sample.shuffle = await page.evaluate(() => ({
              fontStatus: document.fonts.status,
              time: performance.now(),
            }));
            sample.shuffle.elapsedMs = sample.shuffle.time - actionStart;
          }
          if (sample.shuffle) {
            sample.shuffle.note =
              'Animation completes after the fixed loading window; not included in LCP/FCP.';
          }
          report.samples = report.samples.filter(
            row =>
              !(
                row.route === route &&
                row.variant === variant &&
                row.cache === cache &&
                row.round === round
              )
          );
          report.samples.push(sample);
          await writeFile(
            `${OUT}/samples.json`,
            JSON.stringify(report, null, 2) + '\n'
          );
          console.log(
            JSON.stringify({
              round,
              route,
              variant,
              cache,
              fcp: Math.round(metrics.fcp),
              lcp: Math.round(metrics.lcp),
              fonts: Math.round(metrics.fontReady),
              fontRequests: sample.fontRequests,
              cached: sample.cachedFontRequests,
            })
          );
          await page.close();
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const metrics = [
  'fcp',
  'lcp',
  'fontReady',
  'fontNetworkEnd',
  'fontLoadEnd',
  'requests',
  'networkRequests',
  'fontRequests',
  'cachedFontRequests',
  'fontTransferBytes',
  'transferBytes',
  'cls',
];
function describe(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    median:
      sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0],
    max: sorted.at(-1),
  };
}
const summary = [];
for (const route of routes) {
  for (const cache of ['cold', 'warm']) {
    const groups = Object.fromEntries(
      ['before', 'after'].map(variant => [
        variant,
        report.samples.filter(
          row =>
            row.route === route &&
            row.cache === cache &&
            row.variant === variant
        ),
      ])
    );
    const row = { route, cache, count: ROUNDS, metrics: {} };
    for (const metric of metrics) {
      row.metrics[metric] = Object.fromEntries(
        ['before', 'after'].map(variant => [
          variant,
          describe(groups[variant].map(sample => sample[metric])),
        ])
      );
      row.metrics[metric].pairedDelta = describe(
        groups.after.map(
          sample =>
            sample[metric] -
            groups.before.find(before => before.round === sample.round)[metric]
        )
      );
    }
    summary.push(row);
  }
}
await writeFile(
  `${OUT}/summary.json`,
  JSON.stringify(
    {
      conditions: report.conditions,
      environment: report.environment,
      browser: report.browser,
      summary,
    },
    null,
    2
  ) + '\n'
);
