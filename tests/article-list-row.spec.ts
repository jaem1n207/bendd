import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

for (const route of ['/article', '/craft']) {
  test(`${route}: 제목·선·날짜가 한 줄을 유지한다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const rows = page.locator('main a[data-fluid-hover-item]').filter({
      has: page.locator('h2'),
    });
    await expect(rows.first()).toBeVisible();

    for (const width of [320, 390, 768, 1440, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      const metrics = await rows.evaluateAll(elements =>
        elements.map(element => {
          const heading = element.querySelector('h2')!;
          const date = element.lastElementChild!;
          const line = element.querySelector('div[aria-hidden="true"]')!;
          const titleRect = heading.getBoundingClientRect();
          const dateRect = date.getBoundingClientRect();
          const rowRect = element.getBoundingClientRect();
          return {
            titleLines:
              titleRect.height /
              Number.parseFloat(getComputedStyle(heading).lineHeight),
            alignment: Math.abs(
              titleRect.top +
                titleRect.height / 2 -
                dateRect.top -
                dateRect.height / 2
            ),
            lineWidth: line.getBoundingClientRect().width,
            titleWidth: titleRect.width,
            dateInside: dateRect.right <= rowRect.right,
          };
        })
      );
      for (const metric of metrics) {
        expect(metric.titleLines).toBeLessThanOrEqual(1.05);
        expect(metric.alignment).toBeLessThanOrEqual(1);
        expect(metric.lineWidth).toBeGreaterThanOrEqual(16);
        expect(metric.titleWidth).toBeGreaterThan(100);
        expect(metric.dateInside).toBe(true);
      }
    }
  });

  test(`${route}: 한 줄 배치에서 두 선 애니메이션이 실행된다`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${baseURL}${route}`);
    const row = page
      .locator('main a[data-fluid-hover-item]')
      .filter({
        has: page.locator('h2'),
      })
      .first();
    await expect(row).toHaveAttribute('data-line-entrance', 'active');
    const line = row.locator('div[aria-hidden="true"]');
    const animations = await line.evaluate(element => ({
      before: getComputedStyle(element, '::before').animationName,
      after: getComputedStyle(element, '::after').animationName,
    }));
    expect(animations.before).toContain('lineFlash');
    expect(animations.after).toContain('lineDraw');
  });
}
