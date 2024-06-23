import { expect, test } from '@playwright/test';

test('can navigate to Article', async ({ page }) => {
  await page.goto('/');

  const ariaLabel = page.locator('a[aria-label="Article"]');

  await ariaLabel.click();
  const articleHref = page.locator(
    'a[href="/article/naming-tokens-in-design"]'
  );
  await expect(articleHref).toBeVisible();
});
