import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const desktop = { width: 1440, height: 1000 };
const largeDisplay = { width: 2560, height: 2492 };
const pages = [
  {
    route: '/',
    selectors: [
      '[class*="home-studio_wordmark"]',
      '[class*="home-profile_person"] h1',
      '[class*="home-profile_bio"] p',
      '[class*="tech-stack_item"]',
      '[class*="home-studio_headingTitle"] h2',
    ],
  },
  { route: '/article', selectors: ['main h2', 'main a span'] },
  { route: '/craft', selectors: ['main h2', 'main a span'] },
  {
    route: '/article/series/ai-coding-agent',
    selectors: ['main h1', 'main h3', 'main p'],
  },
  {
    route: '/craft/series/synchronize-tab-scrolling',
    selectors: ['main h1', 'main h3', 'main p'],
  },
];

async function fontSize(element: Locator) {
  return element.evaluate(node =>
    Number.parseFloat(getComputedStyle(node).fontSize)
  );
}

test('Dock 툴팁·설정도 공통 글자 크기 비율을 따른다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(desktop);
  await page.goto(`${baseURL}/`);
  const footer = page.locator('footer[aria-labelledby="footer-navigation"]');
  const link = footer.getByRole('link', { name: 'Article', exact: true });
  await link.focus();
  const tooltip = footer.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const tooltipDesktop = await fontSize(tooltip);
  await page.setViewportSize(largeDisplay);
  await link.focus();
  const rootRatio = 19 / 17.8;
  expect((await fontSize(tooltip)) / tooltipDesktop).toBeCloseTo(rootRatio, 2);

  await page.setViewportSize(desktop);
  await footer
    .getByRole('slider', { name: 'Dock 크기 조절' })
    .first()
    .press('Enter');
  const settings = page.getByRole('dialog', { name: 'Dock 설정' });
  await expect(settings).toBeVisible();
  const settingsDesktop = await fontSize(settings);
  await page.setViewportSize(largeDisplay);
  expect((await fontSize(settings)) / settingsDesktop).toBeCloseTo(
    rootRatio,
    2
  );
});

test('본문 밖 목차도 공통 글자 크기 비율을 따른다', async ({ page }) => {
  await page.setViewportSize(desktop);
  await page.goto(`${baseURL}/article/naming-tokens-in-design`);
  const label = page.locator('[data-toc-rail-link] > span').first();
  await expect(label).toBeAttached();
  const desktopSize = await fontSize(label);
  await page.setViewportSize(largeDisplay);
  expect((await fontSize(label)) / desktopSize).toBeCloseTo(19 / 17.8, 2);
});

for (const { route, selectors } of pages) {
  test(`${route}: 모든 영역이 공통 글자 크기 비율을 따른다`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(desktop);
    await page.goto(`${baseURL}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const root = page.locator('html');
    const desktopRoot = await fontSize(root);
    const desktopSizes = [];
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      await expect(element).toBeAttached();
      desktopSizes.push(await fontSize(element));
    }

    await page.setViewportSize(largeDisplay);
    const largeRoot = await fontSize(root);
    expect(largeRoot).toBeCloseTo(19, 1);
    expect(largeRoot).toBeGreaterThan(desktopRoot);
    for (const [index, selector] of selectors.entries()) {
      const largeSize = await fontSize(page.locator(selector).first());
      expect(largeSize / desktopSizes[index]).toBeCloseTo(
        largeRoot / desktopRoot,
        2
      );
    }

    for (const width of [320, 390, 1120, 1280, largeDisplay.width]) {
      await page.setViewportSize({ width, height: largeDisplay.height });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}
