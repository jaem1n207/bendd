import { expect, test } from '@playwright/test';

test.describe('Table of Contents sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');
  });

  test('should be visible on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();
  });

  test('should be hidden on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const tocContainer = page.locator('.fixed.bottom-16.left-5.top-24');
    await expect(tocContainer).toBeHidden();
  });

  test('should display "On this page" heading', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await expect(page.locator('text=On this page')).toBeVisible();
  });

  test('should contain TOC items as links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocLinks = page.locator('nav.toc-navbar ul a');
    const count = await tocLinks.count();

    expect(count).toBeGreaterThan(0);

    const firstLink = tocLinks.first();
    await expect(firstLink).toHaveAttribute('href', /^#/);
  });

  test('should show back link to article list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const backLink = page.locator(
      '.fixed.bottom-16.left-5.top-24 a[href="/article"]'
    );
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Article');
  });

  test('should not extend below bottom-16 boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const container = page.locator('.fixed.bottom-16.left-5.top-24');
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    expect(box).not.toBeNull();

    const viewportHeight = 800;
    const bottom16InPx = 64;
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      viewportHeight - bottom16InPx + 1
    );
  });
});

test.describe('TOC highlight after page refresh', () => {
  test('should highlight only one TOC item after refresh and scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/naming-tokens-in-design');

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();

    await page.reload();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect
      .poll(async () =>
        page.locator('nav.toc-navbar ul a.\\!text-foreground').count()
      )
      .toBeLessThanOrEqual(1);
  });

  test('should maintain single highlight while scrolling after refresh', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/naming-tokens-in-design');

    await page.reload();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    const scrollPositions = [300, 600, 1200, 1800];
    for (const pos of scrollPositions) {
      await page.evaluate(y => window.scrollTo(0, y), pos);

      await expect
        .poll(async () =>
          page.locator('nav.toc-navbar ul a.\\!text-foreground').count()
        )
        .toBeLessThanOrEqual(1);
    }
  });
});

test.describe('TOC highlight restored on refresh without scroll', () => {
  test('should show highlight immediately after refresh at mid-page position', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/naming-tokens-in-design');

    const tocNav = page.locator('nav.toc-navbar');
    const highlightedLink = page.locator(
      'nav.toc-navbar ul a.\\!text-foreground'
    );

    await expect(tocNav).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(highlightedLink).toHaveCount(1);

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    await expect(highlightedLink).toHaveCount(1);
  });
});

test.describe('TOC sidebar on craft pages', () => {
  test('should show back link to craft list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/craft/implement-rauno-style-text-animation');

    const backLink = page.locator(
      '.fixed.bottom-16.left-5.top-24 a[href="/craft"]'
    );
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Craft');
  });
});
