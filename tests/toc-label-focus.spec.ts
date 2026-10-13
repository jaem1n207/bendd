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

test('read h3 rail uses the same filled stroke as h2', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/article/naming-tokens-in-design`);

  const nav = page.getByRole('navigation', { name: '글 목차' });
  const h2 = nav.locator('[data-toc-rail-link][data-depth="0"]').first();
  const h3 = nav.locator('[data-toc-rail-link][data-depth="1"]').first();
  await h3.waitFor();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(h2).toHaveAttribute('data-passed', 'true');
  await expect(h3).toHaveAttribute('data-passed', 'true');

  const filledStroke = async (link: typeof h2) =>
    link
      .locator('span')
      .last()
      .evaluate(element => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          right: style.right,
          color: style.backgroundColor,
        };
      });

  expect(await filledStroke(h3)).toEqual(await filledStroke(h2));
  await nav.hover();
  expect(await filledStroke(h3)).toEqual(await filledStroke(h2));
});
