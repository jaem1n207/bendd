import { expect, test, type Page, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const sanFrancisco = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: 'San Francisco',
  country: 'US',
  timeZone: 'America/Los_Angeles',
};
const seoul = {
  latitude: 37.5665,
  longitude: 126.978,
  city: 'Seoul',
  country: 'KR',
  timeZone: 'Asia/Seoul',
};
// A 20 km great-circle journey, bearing 120 degrees from the Seoul reference.
const nearbySeoul = {
  latitude: 37.47640540822408,
  longitude: 127.1742778820604,
};

async function openGlobe(
  page: Page,
  location: {
    latitude: number;
    longitude: number;
    timeZone?: string;
  } | null = sanFrancisco
) {
  await page.route('**/api/visitor-location', route =>
    route.fulfill({ json: { location } })
  );
  await page.goto(baseURL);
  const section = page.locator('[data-connection-globe]');
  const stage = section.locator('[data-ready]');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-ready', 'true');
  await expect(section.locator('figure')).toHaveAttribute(
    'data-globe-entrance',
    /entering|visible/
  );
  return { section, stage };
}

async function sampleClock(stage: Locator) {
  return stage.evaluate(
    element =>
      new Promise<number[]>(resolve => {
        const samples: number[] = [];
        const sample = () => {
          samples.push(Number(element.getAttribute('data-elapsed')));
          if (samples.length === 16) {
            resolve(samples);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      })
  );
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Expected the globe element to have a layout box');
  }
  return box;
}

async function recordEntrances(page: Page) {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options);
      if (
        this instanceof HTMLElement &&
        (this.matches('[data-connection-globe] figure') ||
          this.hasAttribute('data-time-difference'))
      ) {
        const effect = animation.effect;
        this.dataset.observedDuration = String(effect?.getTiming().duration);
        this.dataset.observedEasing = String(effect?.getTiming().easing);
        this.dataset.observedTransforms =
          effect instanceof KeyframeEffect
            ? effect
                .getKeyframes()
                .map(frame => frame.transform ?? 'none')
                .join(',')
            : '';
        if (this.tagName === 'FIGURE') {
          const figure = this;
          let maximum = 0;
          const sample = () => {
            if (figure.dataset.globeEntrance !== 'entering') {
              return;
            }
            maximum = Math.max(
              maximum,
              Number(
                figure
                  .querySelector('[data-elapsed]')
                  ?.getAttribute('data-elapsed') ?? 0
              )
            );
            figure.dataset.maxEntranceElapsed = String(maximum);
            requestAnimationFrame(sample);
          };
          sample();
        }
      }
      return animation;
    };
  });
}

async function observeTimeCount(page: Page) {
  return page.locator('[data-time-difference]').evaluate(
    row =>
      new Promise<{
        values: string[];
        phases: string[];
        duration: number;
        widths: number[];
      }>(resolve => {
        const values: string[] = [];
        const phases: string[] = [];
        const widths: number[] = [];
        let start = 0;
        const sample = () => {
          const state = row.getAttribute('data-time-state');
          const value = row.querySelector('[data-time-value]');
          if (state === 'counting' && !start) {
            start = performance.now();
          }
          if (state === 'counting') {
            phases.push(
              row
                .closest('figure')
                ?.querySelector('[data-phase]')
                ?.getAttribute('data-phase') ?? ''
            );
          }
          values.push(value?.textContent ?? '');
          widths.push(value?.parentElement?.getBoundingClientRect().width ?? 0);
          if (state === 'complete') {
            resolve({
              values,
              phases,
              duration: performance.now() - start,
              widths,
            });
          } else {
            requestAnimationFrame(sample);
          }
        };
        sample();
      })
  );
}

test('waits for the home heading before revealing and playing the globe', async ({
  page,
}) => {
  await recordEntrances(page);
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.route('**/api/visitor-location', route =>
    route.fulfill({ json: { location: seoul } })
  );
  // A cold hydration beyond 600ms intentionally takes the readable fallback.
  // Warm the route so this test observes the separate normal entrance path.
  await page.goto(baseURL);
  await expect(page.locator('[data-globe-heading]')).toHaveAttribute(
    'data-reveal-state',
    /.+/
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  const section = page.locator('[data-connection-globe]');
  const figure = section.locator('figure');
  const heading = section.locator('header');
  const stage = section.locator('[data-ready]');
  await expect(heading).toHaveAttribute('data-reveal', 'true');
  await stage.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute(
    'data-reveal-state',
    /initial|entering/
  );
  await expect(figure).toHaveCSS('opacity', '0');
  await expect(figure).toHaveCSS('visibility', 'hidden');
  await expect(heading).toHaveAttribute('data-reveal-state', 'visible');
  await expect(figure).toHaveAttribute('data-globe-entrance', 'visible');
  await expect(figure).toHaveAttribute('data-observed-duration', '120');
  await expect(figure).toHaveAttribute(
    'data-observed-easing',
    'cubic-bezier(0.19, 1, 0.22, 1)'
  );
  await expect(figure).toHaveAttribute('data-observed-transforms', 'none,none');
  await expect(figure).toHaveAttribute('data-max-entrance-elapsed', '0');
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await expect(figure).toHaveAttribute('data-globe-entrance', 'visible');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
});

test('keeps the loading globe hidden after the heading until location is ready', async ({
  page,
}) => {
  let releaseLocation: () => void = () => {};
  const gate = new Promise<void>(resolve => {
    releaseLocation = resolve;
  });
  await page.route('**/api/visitor-location', async route => {
    await gate;
    await route.fulfill({ json: { location: nearbySeoul } });
  });
  await page.goto(baseURL);
  const section = page.locator('[data-connection-globe]');
  const stage = section.locator('[data-ready]');
  await stage.scrollIntoViewIfNeeded();
  await expect(section.locator('header')).toHaveAttribute(
    'data-reveal-state',
    'visible'
  );
  await expect(stage).toHaveAttribute('data-ready', 'false');
  await expect(section.locator('figure')).toHaveCSS('visibility', 'hidden');
  releaseLocation();
  await expect(section.locator('figure')).toHaveAttribute(
    'data-globe-entrance',
    /entering|visible/
  );
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
});

test('starts a full journey after a fast mobile scroll skips the pending heading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/visitor-location', route =>
    route.fulfill({ json: { location: seoul } })
  );
  await page.goto(baseURL);
  const section = page.locator('[data-connection-globe]');
  const stage = section.locator('[data-ready]');
  await expect(section.locator('header')).toHaveAttribute(
    'data-reveal-state',
    'pending'
  );
  await stage.evaluate(element =>
    window.scrollTo(
      0,
      window.scrollY + element.getBoundingClientRect().top + 20
    )
  );
  await expect(section.locator('figure')).toHaveAttribute(
    'data-globe-entrance',
    /entering|visible/
  );
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(
    section.getByRole('button', { name: '방문자와 재민의 공유 반경 다시 재생' })
  ).toBeVisible();
});

test('keeps the server-rendered greeting readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL);
    const section = page.locator('[data-connection-globe]');
    await expect(section.locator('header')).toBeVisible();
    await expect(section.locator('figure')).toHaveCSS('opacity', '1');
    await expect(section.locator('figure')).toHaveCSS('visibility', 'visible');
    await expect(section.locator('figcaption > p')).toBeVisible();
    await expect(section.locator('figcaption > p')).toHaveText(
      '당신이 있는 곳과 제가 있는 곳을 이어 볼게요.'
    );
    await expect(section.locator('canvas')).toHaveCount(0);
    await expect(section.locator('noscript p')).toBeVisible();
    await expect(section.locator('noscript p')).toHaveText(
      'JavaScript를 켜면 서울까지의 추정 거리를 볼 수 있어요.'
    );
  } finally {
    await context.close();
  }
});

test('waits for the land mask before showing the reduced-motion point globe', async ({
  page,
}) => {
  let releaseMask: () => void = () => {};
  const gate = new Promise<void>(resolve => {
    releaseMask = resolve;
  });
  await page.route('**/globe/land-mask.png', async route => {
    await gate;
    await route.continue();
  });
  await page.route('**/api/visitor-location', route =>
    route.fulfill({ json: { location: sanFrancisco } })
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const stage = page.locator('[data-connection-globe] [data-ready]');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-ready', 'false');
  releaseMask();
  await expect(stage).toHaveAttribute('data-ready', 'true');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(stage.locator('canvas')).toHaveAttribute(
    'data-renderer',
    'particles-3d'
  );
  expect(
    Number(await stage.locator('canvas').getAttribute('data-land-points'))
  ).toBeGreaterThan(2500);
});

test('connects the visitor to Seoul, settles the counter beside the favicon, and replays on home entry', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { section, stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-phase', 'connecting');
  await expect(stage).toHaveAttribute(
    'data-progress',
    /^(0\.[1-9]|0\.0*[1-9])/
  );
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(stage).toHaveAttribute('data-fallback', 'false');
  await expect(section.locator('figcaption')).toContainText('약 9,029km');
  await expect(section.locator('figcaption')).toContainText(
    '그래도 웹에서는 이렇게 빠르게 만날 수 있죠.'
  );
  await expect(section.locator('[data-distance-value]')).toHaveText('9,029 km');
  const number = await requiredBox(section.locator('[data-distance-value]'));
  const rabbit = await requiredBox(section.locator('[data-seoul-avatar]'));
  expect(number.y + number.height).toBeLessThan(rabbit.y);
  await expect(section.locator('[data-seoul-avatar]')).toBeVisible();
  expect(errors).toEqual([]);

  await page.getByRole('link', { name: 'Article', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/article`);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await page.reload();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
});

test('pauses outside the viewport and resumes the same journey', async ({
  page,
}) => {
  const { stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  // Let the native observer deliver its visibility change, then sample multiple frames.
  await sampleClock(stage);
  const paused = await sampleClock(stage);
  expect(new Set(paused).size).toBe(1);
  expect(paused[0]).toBeGreaterThan(0);
  expect(paused[0]).toBeLessThan(4600);
  await stage.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => Number(await stage.getAttribute('data-elapsed')))
    .toBeGreaterThan(paused[0]);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
});

test('arrives at one shared Seoul location and replays the halo without dragging', async ({
  page,
}) => {
  const { section, stage } = await openGlobe(page, seoul);
  await expect(stage).toHaveAttribute('data-phase', 'connecting');
  await expect(section.locator('[data-nearby-distance-value]')).toHaveText(
    '0 m'
  );
  const arrivalFrames = await sampleClock(stage);
  expect(arrivalFrames.at(-1)).toBeGreaterThan(arrivalFrames[0]);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(stage).toHaveAttribute('data-nearby', 'true');
  await expect(section.locator('[data-nearby-distance-value]')).toBeVisible();
  await expect(section.locator('figcaption')).toContainText('약 0m');
  await expect(stage.locator('[data-route-path]')).toHaveAttribute('d', '');
  await expect(stage.locator('[data-distance-label]')).toBeHidden();
  await expect(stage.locator('[data-seoul-marker]')).toBeHidden();
  await expect(stage.locator('[data-visitor-marker]')).toHaveCSS(
    'opacity',
    '0'
  );
  await expect(section.getByText('같은 위치로 표시돼요')).toBeVisible();
  await expect(section.getByText('서울의 재민', { exact: true })).toHaveCount(
    0
  );
  await expect(section.locator('[data-nearby-anchor]')).toContainText(
    '서울 부근'
  );
  await expect(section.locator('figcaption')).not.toContainText(
    '그래도 웹에서는'
  );
  const button = section.getByRole('button', {
    name: '방문자와 재민의 공유 반경 다시 재생',
  });
  await expect(button).toBeEnabled();
  const camera = await stage.getAttribute('data-camera');
  await button.click();
  await expect(stage.locator('[data-shared-pulse]')).toHaveAttribute(
    'data-shared-pulse',
    '1'
  );
  await expect(stage).not.toHaveAttribute('data-grabbing', 'true');
  await expect(stage).toHaveAttribute('data-camera', camera ?? '');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(stage.locator('[data-shared-pulse]')).toHaveAttribute(
    'data-shared-pulse',
    '2'
  );
  await page.keyboard.press('Space');
  await expect(stage.locator('[data-shared-pulse]')).toHaveAttribute(
    'data-shared-pulse',
    '3'
  );
  await page.keyboard.press('ArrowLeft');
  await expect(stage).toHaveAttribute('data-camera', camera ?? '');
  await expect(stage).toHaveAttribute('data-color-time', '0');
  await sampleClock(stage);
  await expect(stage).toHaveAttribute('data-color-time', '0');
});

for (const width of [390, 1280]) {
  test(`shares one Seoul halo at 20 km on a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    const { section, stage } = await openGlobe(page, nearbySeoul);
    await expect(stage).toHaveAttribute('data-phase', 'complete');
    await expect(stage).toHaveAttribute('data-nearby', 'true');
    await expect(stage.locator('canvas')).toHaveCount(1);
    await expect(stage.locator('[data-local-map]')).toHaveCount(0);
    await expect(section.locator('[data-nearby-distance-value]')).toHaveText(
      '20 km'
    );
    await expect(section.locator('h2')).toHaveText(
      '서울에서 만들고, 다듬고 있습니다.'
    );
    await expect(section.locator('figcaption')).toContainText(
      '지금 우리는 약 20km 떨어져 있네요.'
    );
    await expect(section.locator('figcaption')).not.toContainText(
      '그래도 웹에서는'
    );
    await expect(
      section.getByText('저는 대한민국 서울에 살고 있어요.')
    ).toHaveCount(0);
    await expect(section.getByText('서울의 재민', { exact: true })).toHaveCount(
      0
    );
    await expect(stage.locator('[data-route-path]')).toHaveAttribute('d', '');
    await expect(section.getByText('가까운 곳에서 만났네요')).toBeVisible();
    const button = section.getByRole('button', {
      name: '방문자와 재민의 공유 반경 다시 재생',
    });
    await expect(button).toBeVisible();
    await expect(button).toContainText('방문자');
    await expect(button).toContainText('재민');
    await expect(button.locator('svg')).toHaveCSS('width', '22px');
    await expect(button.locator('svg')).toHaveCSS('height', '22px');
    const stageBox = await requiredBox(stage);
    for (const locator of [
      section.locator('[data-nearby-distance-value]'),
      button,
    ]) {
      const box = await requiredBox(locator);
      expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
      expect(box.x + box.width).toBeLessThanOrEqual(
        stageBox.x + stageBox.width
      );
      expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(
        stageBox.y + stageBox.height
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width);
    await button.click();
    await expect(stage.locator('[data-shared-pulse] > span').first()).toHaveCSS(
      'animation-name',
      'none'
    );
    await expect(section.locator('[data-nearby-distance-value]')).toHaveText(
      '20 km'
    );
    await page.getByRole('button', { name: '테마 전환' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(button).toBeVisible();
    await expect(section.locator('[data-nearby-distance-value]')).toHaveText(
      '20 km'
    );
  });
}

test('keeps the shared halo attached to Seoul and removes it from focus behind the globe', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section, stage } = await openGlobe(page, nearbySeoul);
  const button = section.getByRole('button', {
    name: '방문자와 재민의 공유 반경 다시 재생',
  });
  await expect(button).toBeVisible();
  const original = await stage
    .locator('[data-nearby-anchor]')
    .getAttribute('style');
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage.locator('[data-nearby-anchor]')).not.toHaveAttribute(
    'style',
    original ?? ''
  );
  for (let turn = 0; turn < 26; turn += 1) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(button).toBeHidden();
  await page.keyboard.press('Home');
  await expect(button).toBeVisible();
  await expect(stage.locator('[data-route-path]')).toHaveAttribute('d', '');
});

test('does not replay the shared greeting when reduced motion is turned off', async ({
  page,
}) => {
  const { section, stage } = await openGlobe(page, nearbySeoul);
  await expect(stage).toHaveAttribute('data-phase', 'camera');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  const button = section.getByRole('button', {
    name: '방문자와 재민의 공유 반경 다시 재생',
  });
  const ring = stage.locator('[data-shared-pulse] > span').first();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(button).toHaveCSS('animation-name', 'none');
  await expect(ring).toHaveCSS('animation-name', 'none');
  await button.click();
  await expect(ring).not.toHaveCSS('animation-name', 'none');
  await expect(button).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(ring).toHaveCSS('animation-name', 'none');
});

test('reduced motion stays at the final frame on mobile and preserves it across a theme change', async ({
  page,
}) => {
  // Record the short native effect before it finishes; do not slow down playback.
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (
        this.matches('[data-connection-globe] figure') &&
        animation.effect instanceof KeyframeEffect
      ) {
        this.setAttribute(
          'data-test-fade-duration',
          String(animation.effect.getTiming().duration)
        );
        this.setAttribute(
          'data-test-fade-transforms',
          animation.effect
            .getKeyframes()
            .map(frame => frame.transform)
            .join(',')
        );
        this.setAttribute(
          'data-test-fade-opacity',
          animation.effect
            .getKeyframes()
            .map(frame => frame.opacity)
            .join(',')
        );
      }
      return animation;
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const { section, stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(section.locator('figure')).toHaveAttribute(
    'data-test-fade-duration',
    '150'
  );
  await expect(section.locator('figure')).toHaveAttribute(
    'data-test-fade-transforms',
    'none,none'
  );
  await expect(section.locator('figure')).toHaveAttribute(
    'data-test-fade-opacity',
    '0,1'
  );
  expect(new Set(await sampleClock(stage))).toEqual(new Set([4600]));
  await expect(section.locator('[data-distance-value]')).toBeVisible();
  await page.getByRole('button', { name: '테마 전환' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  expect(new Set(await sampleClock(stage))).toEqual(new Set([4600]));
  const width = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
});

for (const [name, location] of Object.entries({
  globe: sanFrancisco,
  local: nearbySeoul,
})) {
  test(`turning on reduced motion mid-flight settles the ${name} scene without restarting it`, async ({
    page,
  }) => {
    const { stage } = await openGlobe(page, location);
    await expect(stage).toHaveAttribute('data-phase', 'camera');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(stage).toHaveAttribute('data-phase', 'complete');
    expect(new Set(await sampleClock(stage))).toEqual(new Set([4600]));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(new Set(await sampleClock(stage))).toEqual(new Set([4600]));
  });
}

test('unavailable geolocation shows the Seoul greeting without a made-up distance', async ({
  page,
}) => {
  const { section } = await openGlobe(page, null);
  await expect(section.locator('figcaption')).toContainText(
    '위치를 확인하지 못했지만'
  );
  await expect(section.locator('[data-distance-value]')).toBeHidden();
  await expect(section.locator('[data-seoul-avatar]')).toBeVisible();
});

test('retains the distance and route when WebGL is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (
        this: HTMLCanvasElement,
        name: string,
        ...args: unknown[]
      ) {
        return name.startsWith('webgl')
          ? null
          : Reflect.apply(getContext, this, [name, ...args]);
      },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section, stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-fallback', 'true');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(section.locator('[data-fallback-globe]')).toBeVisible();
  await expect(section.locator('[data-distance-value]')).toBeVisible();
});

test('retains the shared vicinity and replay button when WebGL is unavailable nearby', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (
        this: HTMLCanvasElement,
        name: string,
        ...args: unknown[]
      ) {
        return name.startsWith('webgl')
          ? null
          : Reflect.apply(getContext, this, [name, ...args]);
      },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section, stage } = await openGlobe(page, nearbySeoul);
  await expect(stage).toHaveAttribute('data-fallback', 'true');
  await expect(stage.locator('[data-fallback-globe]')).toBeVisible();
  await expect(stage.locator('[data-route-path]')).toHaveAttribute('d', '');
  await expect(section.locator('[data-nearby-distance-value]')).toHaveText(
    '20 km'
  );
  await section
    .getByRole('button', { name: '방문자와 재민의 공유 반경 다시 재생' })
    .click();
  await expect(stage.locator('[data-shared-pulse]')).toHaveAttribute(
    'data-shared-pulse',
    '1'
  );
});

test('fits antipodal markers and the arrival label on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section, stage } = await openGlobe(page, {
    latitude: -seoul.latitude,
    longitude: seoul.longitude - 180,
  });
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  const stageBox = await requiredBox(stage);
  for (const locator of [
    section.locator('[data-distance-value]'),
    section.locator('[data-seoul-avatar]'),
  ]) {
    const box = await requiredBox(locator);
    expect(box.x).toBeGreaterThanOrEqual(stageBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width);
    expect(box.y).toBeGreaterThanOrEqual(stageBox.y);
    expect(box.y + box.height).toBeLessThanOrEqual(
      stageBox.y + stageBox.height
    );
  }
});

test('unlocks dragging after the intro and stops after the short inertia', async ({
  page,
}) => {
  const { stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-phase', 'forming');
  await expect(stage).toHaveAttribute('data-interactive', 'false');
  const box = await requiredBox(stage);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 30,
    box.y + box.height / 2 + 10
  );
  await expect(stage).not.toHaveAttribute('data-grabbing', 'true');
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await expect(stage).toHaveAttribute('data-interactive', 'true');
  const before = await stage.getAttribute('data-camera');
  const routeBefore = await stage
    .locator('[data-route-path]')
    .getAttribute('d');
  await page.mouse.move(box.x + box.width / 2 - 180, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, {
    steps: 18,
  });
  await expect(stage).toHaveAttribute('data-grabbing', 'true');
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute('data-camera', before ?? '');
  await expect(stage.locator('[data-route-path]')).not.toHaveAttribute(
    'd',
    routeBefore ?? ''
  );
  await expect(stage.locator('[data-seoul-marker]')).toHaveCSS('opacity', '0');
  await sampleClock(stage);
  const resting = await stage.getAttribute('data-camera');
  await sampleClock(stage);
  await expect(stage).toHaveAttribute('data-camera', resting ?? '');
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  await stage.focus();
  await page.keyboard.press('Home');
  await expect(stage).toHaveAttribute('data-camera', before ?? '');
  await page.keyboard.press('ArrowLeft');
  await expect(stage).not.toHaveAttribute('data-camera', before ?? '');
});

test('keeps only the color flow moving after arrival and pauses it out of view', async ({
  page,
}) => {
  const { stage } = await openGlobe(page);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  const camera = await stage.getAttribute('data-camera');
  const color = await stage.getAttribute('data-color-time');
  await expect(stage).not.toHaveAttribute('data-color-time', color ?? '');
  await expect(stage).toHaveAttribute('data-camera', camera ?? '');
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  await sampleClock(stage);
  const paused = await stage.getAttribute('data-color-time');
  await sampleClock(stage);
  await expect(stage).toHaveAttribute('data-color-time', paused ?? '');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).not.toHaveAttribute('data-color-time', paused ?? '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).toHaveAttribute('data-color-time', '0');
  await sampleClock(stage);
  await expect(stage).toHaveAttribute('data-color-time', '0');
});

test('releases a grabbed globe when WebGL is lost and retains the readable fallback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage } = await openGlobe(page);
  const box = await requiredBox(stage);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await expect(stage).toHaveAttribute('data-grabbing', 'true');
  await stage.locator('canvas').evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Expected the globe canvas');
    }
    const extension = canvas
      .getContext('webgl')
      ?.getExtension('WEBGL_lose_context');
    if (!extension) {
      throw new Error(
        'Context-loss extension is needed for this regression test'
      );
    }
    extension.loseContext();
  });
  await expect(stage).toHaveAttribute('data-fallback', 'true');
  await expect(stage).toHaveAttribute('data-grabbing', 'false');
  await expect(stage).toHaveAttribute('data-interactive', 'false');
  const camera = await stage.getAttribute('data-camera');
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-camera', camera ?? '');
  await expect(stage.locator('[data-route-overlay]')).toBeVisible();
  await expect(stage.locator('[data-fallback-globe]')).toBeVisible();
});

test('counts a nonzero time difference after arrival with stable numeric width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  const { section, stage } = await openGlobe(page, {
    ...sanFrancisco,
    timeZone: 'Asia/Kathmandu',
  });
  const row = section.locator('[data-time-difference]');
  await row.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  );
  await expect(row).toHaveAttribute('data-time-state', 'waiting');
  await expect(row.locator('[data-time-announcement]')).toBeEmpty();
  const samples = await observeTimeCount(page);
  expect(samples.values[0]).toBe('0시간 0분');
  expect(new Set(samples.values).size).toBeGreaterThan(3);
  expect(new Set(samples.phases)).toEqual(new Set(['complete']));
  expect(samples.duration).toBeGreaterThan(450);
  expect(samples.duration).toBeLessThan(850);
  expect(
    Math.max(...samples.widths) - Math.min(...samples.widths)
  ).toBeLessThan(1);
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 15분');
  await expect(row.locator('[data-time-announcement]')).toHaveText(
    '서울은 3시간 15분 빠르네요.'
  );
  expect(
    await row.evaluate(element => element.previousElementSibling?.textContent)
  ).toContain('떨어져 있네요.');
  await page.evaluate(() => window.scrollTo(0, 0));
  await stage.scrollIntoViewIfNeeded();
  await expect(row).toHaveAttribute('data-time-state', 'complete');
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 15분');
});

test('fades the exact same-time-zone copy for 150ms without a numeric counter', async ({
  page,
}) => {
  await recordEntrances(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const { section, stage } = await openGlobe(page, seoul);
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  const row = section.locator('[data-time-difference]');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toHaveAttribute('data-time-state', 'complete');
  await expect(row).toHaveAttribute('data-observed-duration', '150');
  await expect(row.locator('[aria-hidden="true"]')).toHaveText(
    '같은 시간대에 머물고 있어요.'
  );
  await expect(row.locator('[data-time-value]')).toHaveCount(0);
});

test('keeps time information absent when IP time zone is unknown', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section } = await openGlobe(page, nearbySeoul);
  await expect(section.locator('[data-time-difference]')).toHaveCount(0);
  await expect(section.locator('figcaption')).toContainText('약 20km');
});

test('shows the final time value with only a fade for reduced motion', async ({
  page,
}) => {
  await recordEntrances(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { section } = await openGlobe(page, {
    ...sanFrancisco,
    timeZone: 'Asia/Kolkata',
  });
  const row = section.locator('[data-time-difference]');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toHaveAttribute('data-time-state', 'complete');
  await expect(row).toHaveAttribute('data-observed-duration', '150');
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 30분');
});

test('waits for the caption to enter the viewport after the journey completes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  const { section, stage } = await openGlobe(page, {
    ...sanFrancisco,
    timeZone: 'Asia/Kathmandu',
  });
  await stage.evaluate(element =>
    window.scrollTo(
      0,
      window.scrollY + element.getBoundingClientRect().top - 150
    )
  );
  await expect(stage).toHaveAttribute('data-phase', 'complete');
  const row = section.locator('[data-time-difference]');
  await expect(row).toHaveAttribute('data-time-state', 'waiting');
  await row.scrollIntoViewIfNeeded();
  const samples = await observeTimeCount(page);
  expect(new Set(samples.values).size).toBeGreaterThan(2);
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 15분');
});

test('pauses the time count when the tab is hidden and resumes without restarting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  const { section } = await openGlobe(page, {
    ...sanFrancisco,
    timeZone: 'Asia/Kathmandu',
  });
  const row = section.locator('[data-time-difference]');
  await row.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  );
  const paused = await row.evaluate(
    element =>
      new Promise<{ before: number; after: number }>(resolve => {
        const watch = () => {
          const progress = Number(element.getAttribute('data-time-progress'));
          if (
            element.getAttribute('data-time-state') !== 'counting' ||
            progress <= 0
          ) {
            requestAnimationFrame(watch);
            return;
          }
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
          });
          document.dispatchEvent(new Event('visibilitychange'));
          // Motion samples the pause instant synchronously before stopping.
          const before = Number(element.getAttribute('data-time-progress'));
          let frames = 0;
          const sample = () => {
            if (++frames < 16) {
              requestAnimationFrame(sample);
              return;
            }
            const after = Number(element.getAttribute('data-time-progress'));
            Reflect.deleteProperty(document, 'visibilityState');
            document.dispatchEvent(new Event('visibilitychange'));
            resolve({ before, after });
          };
          requestAnimationFrame(sample);
        };
        watch();
      })
  );
  expect(paused.before).toBeGreaterThan(0);
  expect(paused.before).toBeLessThan(1);
  expect(paused.after).toBe(paused.before);
  await expect(row).toHaveAttribute('data-time-state', 'complete');
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 15분');
});

test('pauses the time count outside the viewport and resumes from the same value', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  const { section } = await openGlobe(page, {
    ...sanFrancisco,
    timeZone: 'Asia/Kathmandu',
  });
  const row = section.locator('[data-time-difference]');
  await row.evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  );
  const paused = await row.evaluate(
    element =>
      new Promise<{ first: number; last: number }>(resolve => {
        const watch = () => {
          const progress = Number(element.getAttribute('data-time-progress'));
          if (
            element.getAttribute('data-time-state') !== 'counting' ||
            progress <= 0
          ) {
            requestAnimationFrame(watch);
            return;
          }
          window.scrollTo(0, 0);
          let frames = 0;
          let first = 0;
          const sample = () => {
            frames++;
            if (frames === 4) {
              first = Number(element.getAttribute('data-time-progress'));
            }
            if (frames < 20) {
              requestAnimationFrame(sample);
              return;
            }
            resolve({
              first,
              last: Number(element.getAttribute('data-time-progress')),
            });
          };
          requestAnimationFrame(sample);
        };
        watch();
      })
  );
  expect(paused.first).toBeGreaterThan(0);
  expect(paused.first).toBeLessThan(1);
  expect(paused.last).toBe(paused.first);
  await row.scrollIntoViewIfNeeded();
  await expect(row).toHaveAttribute('data-time-state', 'complete');
  await expect(row.locator('[data-time-value]')).toHaveText('3시간 15분');
});

for (const { name, location } of [
  { name: 'far', location: sanFrancisco },
  { name: 'near', location: seoul },
]) {
  test(`loads the Seoul avatar in the ${name} scene`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { section } = await openGlobe(page, location);
    const avatar = section.locator('[data-seoul-avatar]').last();
    await expect
      .poll(() =>
        avatar.evaluate(
          element =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0
        )
      )
      .toBe(true);
  });
}
