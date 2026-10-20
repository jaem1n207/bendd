import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const readingWidthInRem = 37;
const indexes = [
  { route: '/', selector: '[class*="home-profile_bio"]' },
  { route: '/article', selector: 'main > div.relative.mx-auto' },
  { route: '/craft', selector: 'main > div.relative.mx-auto' },
];

for (const { route, selector } of indexes) {
  test(`${route}: 콘텐츠 폭은 공통 글자 크기의 37배 이내다`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const content = page.locator(selector);
    await expect(content).toBeVisible();

    for (const width of [1440, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      const metrics = await content.evaluate(element => {
        const style = getComputedStyle(element);
        return {
          width:
            element.getBoundingClientRect().width -
            Number.parseFloat(style.paddingLeft) -
            Number.parseFloat(style.paddingRight),
          rootSize: Number.parseFloat(
            getComputedStyle(document.documentElement).fontSize
          ),
        };
      });
      expect(metrics.width / metrics.rootSize).toBeCloseTo(
        readingWidthInRem,
        1
      );
    }

    for (const width of [320, 390, 768, 1120, 1280, 1440, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const bounds = await content.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
  });
}
