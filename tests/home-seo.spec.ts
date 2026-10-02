import { expect, test, type Page } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const homeTitle = '이재민 - 소프트웨어 엔지니어';
const canonicalUrl = 'https://bendd.me';
const authorName = '이재민';
const personId = `${canonicalUrl}/#person`;
const httpOk = 200;

// This exercises the mobile crawler's rendering path, not Google's ranking
// system or its verified crawler IPs. Search Console remains the live check.
test.use({
  viewport: { width: 412, height: 915 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 ' +
    'Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
});

async function expectIndexableHome(page: Page) {
  await expect(page).toHaveTitle(homeTitle);
  await expect(page.locator('head title')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonicalUrl
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(authorName);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /개발자 이재민\(bendd\)/
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    homeTitle
  );
  await expect(
    page.locator(
      'meta:is([name="robots"], [name="googlebot"])[content*="noindex" i]'
    )
  ).toHaveCount(0);

  // Read actual script elements: strings in Next's RSC payload alone do not
  // prove Google received a title, content, or structured data in the DOM.
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const graph: unknown = JSON.parse((await jsonLd.textContent()) ?? 'null');
  expect(graph).toMatchObject({
    '@context': 'https://schema.org',
    '@graph': expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        '@id': `${canonicalUrl}/#website`,
        name: homeTitle,
        alternateName: expect.arrayContaining(['bendd']),
      }),
      expect.objectContaining({
        '@type': 'Person',
        '@id': personId,
        name: authorName,
        alternateName: expect.arrayContaining(['bendd', 'jaem1n207']),
      }),
      expect.objectContaining({
        '@type': 'ProfilePage',
        mainEntity: { '@id': personId },
      }),
    ]),
  });
}

test.describe('server-rendered SEO', () => {
  test.use({ javaScriptEnabled: false });

  test('serves title, author and profile data without JavaScript', async ({
    page,
  }) => {
    const response = await page.goto(baseURL);
    expect(response?.status()).toBe(httpOk);
    expect(response?.headers()['x-robots-tag'] ?? '').not.toMatch(/noindex/i);
    await expectIndexableHome(page);
  });
});

test('keeps SEO content after hydration and a client navigation round trip', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(baseURL);
  // BrowserDetector adds this class in a client effect, after hydration.
  await expect(page.locator('html')).toHaveClass(/browser-mobile-chrome/);
  await expectIndexableHome(page);

  await page.getByRole('link', { name: 'Article', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/article`);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expectIndexableHome(page);
  expect(errors).toEqual([]);
});

test('preserves server content when client bundles cannot be fetched', async ({
  page,
}) => {
  await page.route('**/_next/static/**/*.js', route => route.abort());
  await page.goto(baseURL);
  await expectIndexableHome(page);
});
