import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

// A tall viewport gives Craft and Article no scrollbar while Home still needs one.
test.use({ viewport: { width: 1280, height: 1800 } });

test('keeps dock buttons anchored when crossing short and long routes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const dock = page.locator('footer[aria-labelledby="footer-navigation"]');
  const initial = await dock
    .getByRole('link', { name: 'Home', exact: true })
    .boundingBox();
  expect(initial).not.toBeNull();
  if (!initial) {
    throw new Error('Home navigation must be visible');
  }

  for (const [name, pathname] of [
    ['Craft', '/craft'],
    ['Home', '/'],
    ['Article', '/article'],
    ['Home', '/'],
  ]) {
    await dock.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(
      `${baseURL}${pathname === '/' ? '/' : pathname}`
    );
    await expect
      .poll(async () => {
        const next = await dock
          .getByRole('link', { name: 'Home', exact: true })
          .boundingBox();
        return next ? Math.abs(next.x - initial.x) : Infinity;
      })
      .toBeLessThanOrEqual(0.5);
  }
});
