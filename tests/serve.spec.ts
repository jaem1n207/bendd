import { expect, test } from '@playwright/test';
import type { MetadataRoute } from 'next';

import { siteMetadata } from '@/lib/site-metadata';

/**
 * @see https://github.com/vercel/next.js/blob/e4cd547a505c8380cbf010a78f1e2e3ade0f2307/packages/next/src/build/webpack/loaders/metadata/resolve-route-data.ts#L46-L96
 */
function resolveSitemap(data: MetadataRoute.Sitemap): string {
  const hasAlternates = data.some(
    item => Object.keys(item.alternates ?? {}).length > 0
  );

  let content = '';
  content += '<?xml version="1.0" encoding="UTF-8"?>\n';
  content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  if (hasAlternates) {
    content += ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  } else {
    content += '>\n';
  }
  for (const item of data) {
    content += '<url>\n';
    content += `<loc>${item.url}</loc>\n`;

    const languages = item.alternates?.languages;
    if (languages && Object.keys(languages).length) {
      // Since sitemap is separated from the page rendering, there's not metadataBase accessible yet.
      // we give the default setting that won't effect the languages resolving.
      for (const language in languages) {
        content += `<xhtml:link rel="alternate" hreflang="${language}" href="${
          languages[language as keyof typeof languages]
        }" />\n`;
      }
    }
    if (item.lastModified) {
      const serializedDate =
        item.lastModified instanceof Date
          ? item.lastModified.toISOString()
          : item.lastModified;

      content += `<lastmod>${serializedDate}</lastmod>\n`;
    }

    if (item.changeFrequency) {
      content += `<changefreq>${item.changeFrequency}</changefreq>\n`;
    }

    if (typeof item.priority === 'number') {
      content += `<priority>${item.priority}</priority>\n`;
    }

    content += '</url>\n';
  }

  content += '</urlset>\n';

  return content;
}

test('should resolve sitemap.xml with alternates', () => {
  const sitemap = resolveSitemap([
    {
      url: siteMetadata.siteUrl,
      lastModified: new Date('2024-01-01').toISOString().split('T')[0],
      alternates: {
        languages: {
          ['x-default']: siteMetadata.siteUrl,
          ko: siteMetadata.siteUrl,
        },
      },
    },
  ]);

  const expectedSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url>
<loc>https://bendd.me</loc>
<xhtml:link rel="alternate" hreflang="x-default" href="https://bendd.me" />
<xhtml:link rel="alternate" hreflang="ko" href="https://bendd.me" />
<lastmod>2024-01-01</lastmod>
</url>
</urlset>`;

  expect(sitemap).toContain(expectedSitemap);
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
    `정교한 디자인 토큰 설계하기 • ${siteMetadata.title}`
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
