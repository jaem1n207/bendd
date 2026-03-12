import { expect, test } from '@playwright/test';

test.describe('MDX article detail pages', () => {
  test('should render article page without SSR errors', async ({ page }) => {
    const response = await page.goto('/article/naming-tokens-in-design');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: '정교한 디자인 토큰 설계하기' })
    ).toBeVisible();
  });

  test('should render article content body', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    const article = page.locator('article');
    await expect(article).toBeVisible();
    await expect(article).not.toBeEmpty();
  });

  test('should not show error overlay or 500 page', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=localStorage')).not.toBeVisible();
  });

  test('should render multiple different articles', async ({ page }) => {
    const slugs = [
      'naming-tokens-in-design',
      'perfect-dark-mode',
      'managing-cross-cutting-concerns-sound-playback',
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/article/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.getByRole('heading', { level: 2 }).first();
      await expect(heading).toBeVisible();
    }
  });

  test('should set og:title metadata correctly', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /정교한 디자인 토큰/);
  });
});

test.describe('MDX craft detail pages', () => {
  test('should render craft page without SSR errors', async ({ page }) => {
    const response = await page.goto(
      '/craft/implement-rauno-style-text-animation'
    );

    expect(response?.status()).toBe(200);
    const heading = page.getByRole('heading', { level: 2 }).first();
    await expect(heading).toBeVisible();
  });

  test('should render craft content body', async ({ page }) => {
    await page.goto('/craft/implement-rauno-style-text-animation');

    const article = page.locator('article');
    await expect(article).toBeVisible();
    await expect(article).not.toBeEmpty();
  });

  test('should not show error overlay or 500 page on craft', async ({
    page,
  }) => {
    await page.goto('/craft/implement-rauno-style-text-animation');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
  });
});
