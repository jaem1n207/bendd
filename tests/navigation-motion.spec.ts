import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

async function expectStill(item: Locator) {
  await expect(item).toHaveCSS('width', '40px');
  await expect(item).toHaveCSS('top', '0px');
  const positions = await item.evaluate(
    element =>
      new Promise<string[]>(resolve => {
        const samples: string[] = [];
        const sample = () => {
          const style = getComputedStyle(element);
          samples.push(`${style.width}/${style.top}`);
          if (samples.length === 20) {
            resolve(samples);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      })
  );
  expect(new Set(positions)).toEqual(new Set(['40px/0px']));
}

test('reduced dock stays still through hover, press, theme and keyboard navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const theme = page.getByRole('button', { name: '테마 전환' });
  const item = theme.locator('..').locator('..');
  await theme.hover();
  await expectStill(item);
  await expect(theme).toHaveCSS('transform', 'none');
  await page.mouse.down();
  await expectStill(item);
  const oldTheme = await page.locator('html').getAttribute('class');
  await page.mouse.up();
  await expectStill(item);
  await expect(page.locator('html')).not.toHaveAttribute(
    'class',
    oldTheme ?? ''
  );
  const soundState = await page.evaluate(() =>
    localStorage.getItem('sound-enabled')
  );
  await page.getByRole('button', { name: 'Toggle sound', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sound-enabled')))
    .not.toBe(soundState);
  const article = page.getByRole('link', { name: 'Article', exact: true });
  await article.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${baseURL}/article`);
});

test('enabling reduce settles hover and bounce without reviving the old pointer', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  const home = page.getByRole('link', { name: 'Home', exact: true });
  const item = home.locator('..');
  await home.hover();
  await expect
    .poll(() =>
      item.evaluate(element => parseFloat(getComputedStyle(element).width))
    )
    .toBeGreaterThan(60);
  await page.mouse.down();
  await expect
    .poll(() =>
      item.evaluate(element => parseFloat(getComputedStyle(element).top))
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStill(item);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectStill(item);
  await home.hover({ position: { x: 3, y: 20 } });
  await expect
    .poll(() =>
      item.evaluate(element => parseFloat(getComputedStyle(element).width))
    )
    .toBeGreaterThan(50);
  await page.mouse.move(0, 0);
  await expect(item).toHaveCSS('width', '40px');
});
