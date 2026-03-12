import { expect, test } from '@playwright/test';

test.describe('Color contrast - Home page badges', () => {
  test('should use text-foreground/60 on project badges', async ({ page }) => {
    await page.goto('/');

    const badges = page.locator('span.rounded-md.bg-gray-300');
    const count = await badges.count();

    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const badge = badges.nth(i);
      const className = await badge.getAttribute('class');
      expect(className).toContain('text-foreground/60');
      expect(className).not.toContain('text-muted-foreground');
    }
  });
});

test.describe('Color contrast - Article list items', () => {
  test('should not use opacity modifiers on text-muted-foreground', async ({
    page,
  }) => {
    await page.goto('/article');

    await page.waitForSelector('a[href^="/article/"]');

    const hasOpacityModifier = await page.evaluate(() => {
      const allElements = document.querySelectorAll('[class*="muted-foreground"]');
      for (const el of allElements) {
        const classes = el.getAttribute('class') || '';
        if (
          classes.includes('text-muted-foreground/') &&
          !classes.includes('text-muted-foreground/80')
        ) {
          return true;
        }
      }
      return false;
    });

    expect(hasOpacityModifier).toBe(false);
  });

  test('should use plain text-muted-foreground for summary and date', async ({
    page,
  }) => {
    await page.goto('/article');

    await page.waitForSelector('a[href^="/article/"]');

    const mutedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'a[href^="/article/"] .text-muted-foreground'
      );
      return Array.from(elements).map(el => el.getAttribute('class') || '');
    });

    for (const className of mutedElements) {
      expect(className).not.toMatch(/text-muted-foreground\/(?!80)\d+/);
    }
  });
});

test.describe('Playground main landmark', () => {
  test('should have a main element as landmark', async ({ page }) => {
    await page.goto('/playground/shuffle-letters');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should contain the page heading inside main', async ({ page }) => {
    await page.goto('/playground/shuffle-letters');

    const heading = page
      .locator('main')
      .getByRole('heading', { name: 'Shuffle Letters Playground' });
    await expect(heading).toBeVisible();
  });

  test('should contain the form controls inside main', async ({ page }) => {
    await page.goto('/playground/shuffle-letters');

    const main = page.locator('main');
    await expect(main.locator('form')).toBeVisible();
    await expect(main.getByRole('button', { name: 'Shuffle' })).toBeVisible();
  });
});
