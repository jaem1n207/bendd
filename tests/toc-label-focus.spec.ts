import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

test('clicked TOC labels hide after the pointer leaves, while keyboard focus reveals them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/article/naming-tokens-in-design`);

  const nav = page.getByRole('navigation', { name: '글 목차' });
  const link = nav.locator('[data-toc-rail-link]').nth(1);
  const label = link.locator('span').first();
  await link.waitFor();

  await link.hover();
  await expect(label).toHaveCSS('opacity', '1');
  await link.click();
  await page.mouse.move(100, 100);
  await expect(label).toHaveCSS('opacity', '0');

  await page.keyboard.press('Tab');
  await expect(nav.locator(':focus-visible')).toHaveCount(1);
  await expect(label).toHaveCSS('opacity', '1');
});
