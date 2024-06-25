import { siteMetadata } from '@/lib/site-metadata';
import { expect, test } from '@playwright/test';

test('serves a robots.txt', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  const body = await response?.body();

  expect(body?.toString()).toEqual(
    `User-Agent: *\n\nHost: ${siteMetadata.siteUrl}\nSitemap: ${siteMetadata.siteUrl}/sitemap.xml\n`
  );
});

test('serves a sitemap.xml', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  const body = await response?.body();

  expect(body?.toString()).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
  expect(body?.toString()).toContain(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
  );
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/</loc>`);
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article</loc>`
  );
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article/naming-tokens-in-design</loc>`
  );
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article/difference-between-put-patch</loc>`
  );
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article/http-request-methods</loc>`
  );
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article/immediate-motion-component</loc>`
  );
  expect(body?.toString()).toContain(
    `<loc>${siteMetadata.siteUrl}/article/perfect-dark-mode</loc>`
  );
});

test('can be used to configure metadata', async ({ page }) => {
  const metaTitle = page.locator('meta[property="og:title"]');
  const metaImage = page.locator('meta[property="og:image"]');

  await page.goto('/');
  await expect(metaTitle).toHaveAttribute('content', `${siteMetadata.title}`);

  await page.goto('/article');
  await expect(metaTitle).toHaveAttribute(
    'content',
    `피드 • ${siteMetadata.title}`
  );

  await page.goto('/article/naming-tokens-in-design');
  await expect(metaTitle).toHaveAttribute(
    'content',
    `정교한 디자인 토큰 설계하기 • ${siteMetadata.title} article`
  );
  await expect(metaImage).toHaveAttribute(
    'content',
    `${new URL(
      process.env.VERCEL_ENV === 'production'
        ? `${siteMetadata.siteUrl}/`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.CI ? 3001 : 3000}`
    )}api/og?title=${encodeURIComponent('정교한 디자인 토큰 설계하기')}`
  );
});

test('handles not found pages', async ({ page }) => {
  await page.goto('/unknown');
  page.getByRole('heading', {
    name: '404 - 페이지를 찾을 수 없어요',
    level: 1,
  });
});

test('handles rss rewrite', async ({ page }) => {
  const response = await page.goto('/rss.xml');
  expect(response?.url()).toBe(
    `${new URL(
      process.env.VERCEL_ENV === 'production'
        ? `${siteMetadata.siteUrl}/`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.CI ? 3001 : 3000}`
    )}rss.xml`
  );

  const body = await response?.body();
  expect(body?.toString()).toContain(
    `<atom:link href="${siteMetadata.siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`
  );
});
