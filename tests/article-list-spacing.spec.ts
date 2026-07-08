import { expect, type Page, test } from '@playwright/test';

async function getFirstItemGap(page: Page) {
  const items = page.locator(
    [
      'main a[href^="/article/"]:not([href^="/article/series/"])',
      'main a[href^="/craft/"]:not([href^="/craft/series/"])',
    ].join(', ')
  );
  await expect(items.nth(1)).toBeVisible();

  return items.evaluateAll(([first, second]) => {
    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();

    return Math.round(secondRect.top - firstRect.bottom);
  });
}

test('craft list uses the same item spacing as article list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/article');
  const articleGap = await getFirstItemGap(page);

  await page.goto('/craft');
  const craftGap = await getFirstItemGap(page);

  expect(craftGap).toBe(articleGap);
});
