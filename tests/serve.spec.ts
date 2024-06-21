import { siteMetadata } from "@/lib/site-metadata";
import { expect, test } from "@playwright/test";

test("serves a robots.txt", async ({page}) => {
  const response = await page.goto("/robots.txt");
  const body = await response?.body();

  expect(body?.toString()).toEqual(`User-Agent: *\nAllow: /\n\nHost: ${siteMetadata.siteUrl}\nSitemap: ${siteMetadata.siteUrl}/sitemap.xml\n`);
})

test("serves a sitemap.xml", async ({page}) => {
  const response = await page.goto("/sitemap.xml");
  const body = await response?.body();

  expect(body?.toString()).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
  expect(body?.toString()).toContain(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article/naming-tokens-in-design</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article/difference-between-put-patch</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article/http-request-methods</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article/immediate-motion-component</loc>`);
  expect(body?.toString()).toContain(`<loc>${siteMetadata.siteUrl}/article/perfect-dark-mode</loc>`);
});

// TODO: Navigation test, Dynamic OG Test, RSS Redirect Test
