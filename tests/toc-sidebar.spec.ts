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
