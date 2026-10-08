import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

for (const example of [
  {
    path: '/article/immediate-motion-component',
    scopes: ['source.ts'],
    text: 'usePrefersReducedMotion',
  },
  {
    path: '/article/naming-tokens-in-design',
    scopes: ['source.css', 'source.css.scss'],
    text: '$blue-500',
  },
]) {
  test(`${example.path} downloads only the selected syntax grammar`, async ({
    page,
  }) => {
    const scripts: Promise<string>[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (
        response.url().includes('/_next/static/') &&
        response.url().endsWith('.js')
      ) {
        scripts.push(response.text());
      }
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}${example.path}`);
    await expect(
      page.locator('.shiki-magic-move-container').first()
    ).toContainText(example.text);
    const source = (await Promise.all(scripts)).join('\n');
    const grammarSource = source.replaceAll('\\', '');
    const scopes = [...grammarSource.matchAll(/scopeName"?:"([^"]+)"/g)].map(
      match => match[1]
    );
    expect([...new Set(scopes)].sort()).toEqual(example.scopes);
    expect(errors).toEqual([]);
  });
}
