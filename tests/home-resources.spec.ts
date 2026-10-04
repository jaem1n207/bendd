import { expect, test } from '@playwright/test';

const INITIAL_FONT_BUDGET = 250_000;
const MAX_SINGLE_FONT_BYTES = 300_000;
const PUBLIC_ASSET_CACHE =
  'public, max-age=86400, stale-while-revalidate=604800';
const IMMUTABLE_FONT_CACHE = 'public, max-age=31536000, immutable';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`initial resources stay lean at ${viewport.width}px until navigation intent`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const prefetches: string[] = [];
    page.on('request', request => {
      if (request.headers().rsc === '1') {
        prefetches.push(request.url());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('heading', { name: 'Tech Stack', exact: true })
      .scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .flatMap(entry =>
          entry instanceof PerformanceResourceTiming
            ? [{ url: entry.name, bytes: entry.encodedBodySize }]
            : []
        )
    );
    const fonts = resources.filter(resource => resource.url.endsWith('.woff2'));
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.reduce((bytes, font) => bytes + font.bytes, 0)).toBeLessThan(
      INITIAL_FONT_BUDGET
    );
    expect(
      resources.filter(resource => resource.url.includes('/sounds/'))
    ).toEqual([]);
    expect(prefetches).toEqual([]);

    // Portal 메뉴와 숨김 안내문도 공통 UI subset으로 렌더링한다.
    await page.getByRole('button', { name: '브라우저에 추가' }).click();
    await expect(
      page.getByRole('menuitem', { name: /Microsoft Edge/ })
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const largestFont = await page.evaluate(() =>
      Math.max(
        ...performance
          .getEntriesByType('resource')
          .flatMap(entry =>
            entry instanceof PerformanceResourceTiming &&
            entry.name.endsWith('.woff2')
              ? [entry.encodedBodySize]
              : []
          )
      )
    );
    expect(largestFont).toBeLessThan(MAX_SINGLE_FONT_BYTES);
    await page.keyboard.press('Escape');

    const articleLink = page.getByRole('link', {
      name: 'Article',
      exact: true,
    });
    const prefetch = page.waitForRequest(
      request =>
        new URL(request.url()).pathname === '/article' &&
        request.headers().rsc === '1'
    );
    await articleLink.focus();
    await prefetch;
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/article$/);
  });
}

test('audio loads only on interaction and reuses the clicked sample', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/sounds/')) {
      requests.push(request.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);

  const unmute = page.waitForResponse(response =>
    response.url().endsWith('/sounds/unmute.mp3')
  );
  await page.getByRole('button', { name: 'Toggle sound', exact: true }).click();
  expect((await unmute).ok()).toBe(true);

  const clickSound = page.waitForResponse(response =>
    response.url().endsWith('/sounds/blop.mp3')
  );
  await page.getByRole('button', { name: '테마 전환' }).click();
  expect((await clickSound).ok()).toBe(true);
  await page.getByRole('button', { name: '테마 전환' }).click();
  await page.waitForLoadState('networkidle');
  expect(requests.filter(url => url.endsWith('/sounds/blop.mp3'))).toHaveLength(
    1
  );
});

test('cache headers reuse mutable assets and keep font hashes immutable', async ({
  page,
  request,
}) => {
  for (const path of [
    '/sounds/blop.mp3',
    '/images/tech-stack/react.svg',
    '/images/profile/jaemin.jpg',
  ]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()['cache-control']).toBe(PUBLIC_ASSET_CACHE);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  }

  await page.goto('/');
  const photo = page.getByAltText('이재민의 프로필 사진');
  const photoUrl = await photo.evaluate(image =>
    image instanceof HTMLImageElement ? image.currentSrc : ''
  );
  const optimizedPhoto = await request.get(photoUrl);
  expect(optimizedPhoto.ok()).toBe(true);
  expect(optimizedPhoto.headers()['cache-control']).toContain('max-age=86400');

  const fontUrl = await page
    .locator('link[rel="preload"][as="font"]')
    .first()
    .getAttribute('href');
  expect(fontUrl).toBeTruthy();
  const font = await request.get(fontUrl ?? '');
  expect(font.headers()['cache-control']).toBe(IMMUTABLE_FONT_CACHE);
});
