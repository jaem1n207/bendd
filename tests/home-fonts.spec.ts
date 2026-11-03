import { expect, test } from '@playwright/test';

const HOME_FONT_BUDGET_BYTES = 500_000;

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('홈은 생성된 core를 preload하고 큰 본문 폰트를 받지 않는다', async ({
  page,
  baseURL,
}) => {
  const fontBodies: Promise<Buffer>[] = [];
  const fontUrls: string[] = [];

  await page.route('**/*', route => {
    const target = new URL(route.request().url());
    if (target.origin !== new URL(baseURL ?? '').origin) {
      return route.abort();
    }
    if (target.pathname === '/api/visitor-location') {
      return route.fulfill({ json: { location: null } });
    }
    return route.continue();
  });

  page.on('response', response => {
    if (response.request().resourceType() !== 'font') {
      return;
    }
    fontUrls.push(new URL(response.url()).pathname);
    fontBodies.push(response.body());
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');

  expect(fontUrls.length).toBeGreaterThan(0);
  expect(fontUrls.every(url => url.startsWith('/fonts/optimized/'))).toBe(true);
  expect(fontUrls.some(url => url.includes('/content-extended.'))).toBe(false);

  const bytes = (await Promise.all(fontBodies)).reduce(
    (sum, body) => sum + body.length,
    0
  );
  expect(bytes).toBeLessThan(HOME_FONT_BUDGET_BYTES);

  const preloads = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll(links => links.map(link => link.getAttribute('href') ?? ''));
  expect(preloads.length).toBeGreaterThan(0);
  expect(preloads.some(url => /-(extended|symbols)\./.test(url))).toBe(false);
  expect(
    preloads.some(url => /\/(content|mono-500|mono-700)-core\./.test(url))
  ).toBe(false);
});

test('홈 Tech Stack 설명 간격은 CSS 청크 순서와 무관하게 유지된다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const description = page.locator('h3[id^="tech-stack-"] + p').first();
  await expect(description).toHaveCSS('margin-top', '4px');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(description).toHaveCSS('margin-top', '0px');
});
