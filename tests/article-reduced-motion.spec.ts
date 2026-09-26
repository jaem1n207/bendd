import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

async function observeStaticRows(rows: Locator, expected: string[]) {
  const violations = await rows.evaluateAll(
    (elements, originals) =>
      new Promise<string[]>(resolve => {
        const failures = new Set<string>();
        const start = performance.now();
        const sample = () => {
          elements.forEach((element, index) => {
            const heading = element.querySelector('h2');
            if (!heading || heading.textContent !== originals[index]) {
              failures.add(`text:${index}`);
            }
            if (heading && getComputedStyle(heading).opacity !== '1') {
              failures.add(`opacity:${index}`);
            }
            if (getComputedStyle(element).opacity !== '1') {
              failures.add(`link:${index}`);
            }
            const line = element.querySelector('.origin-left');
            if (line) {
              const style = getComputedStyle(line);
              if (
                style.opacity !== '0.5' ||
                !['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(style.transform)
              ) {
                failures.add(`line:${index}`);
              }
            }
            if (
              element
                .getAnimations({ subtree: true })
                .some(animation => animation.playState === 'running')
            ) {
              failures.add(`animation:${index}`);
            }
          });
          if (performance.now() - start >= 2000) {
            resolve([...failures]);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      }),
    expected
  );
  expect(violations).toEqual([]);
}

for (const path of ['/article', '/craft']) {
  test(`${path}: static initial rendering, interrupted shuffle and return navigation`, async ({
    page,
  }) => {
    const rows = page
      .locator(`a[href^="${path}/"]`)
      .filter({ has: page.locator('h2') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}${path}`);
    await expect(rows.first()).toBeVisible();
    const originals = await rows.locator('h2').allTextContents();
    expect(originals.every(text => text.trim().length > 0)).toBe(true);
    await observeStaticRows(rows, originals);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => rows.first().locator('h2').textContent())
      .not.toBe(originals[0]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(rows.first().locator('h2')).toHaveText(originals[0]);
    await observeStaticRows(rows, originals);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await rows.last().scrollIntoViewIfNeeded();
    await observeStaticRows(rows, originals);

    const href = await rows.first().getAttribute('href');
    await rows.first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${baseURL}${href}`);
    await page.goBack();
    await expect(page).toHaveURL(`${baseURL}${path}`);
    await expect(rows.first().locator('h2')).toHaveText(originals[0]);
    await observeStaticRows(rows, originals);
  });
}

test.describe('before hydration', () => {
  test.use({ javaScriptEnabled: false });
  test('server-rendered article links and titles are visible', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/article`);
    const row = page
      .locator('a[href^="/article/"]')
      .filter({ has: page.locator('h2') })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS('opacity', '1');
    await expect(row.locator('h2')).not.toHaveText('');
  });
});
