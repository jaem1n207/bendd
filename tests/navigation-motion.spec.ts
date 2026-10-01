import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

async function expectStill(item: Locator) {
  await expect(item).toHaveCSS('width', '40px');
  await expect(item).toHaveCSS('transform', 'none');
  const positions = await item.evaluate(
    element =>
      new Promise<string[]>(resolve => {
        const samples: string[] = [];
        const sample = () => {
          const rect = element.firstElementChild?.getBoundingClientRect();
          samples.push(rect ? `${rect.x}/${rect.y}/${rect.width}` : 'missing');
          if (samples.length === 20) {
            resolve(samples);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      })
  );
  expect(new Set(positions).size).toBe(1);
  expect(positions[0]).not.toBe('missing');
}

test('reduced dock stays still through hover, press, theme and keyboard navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const dock = page.locator('footer [data-dock]');
  const theme = dock.getByRole('button', { name: '테마 전환' });
  const item = dock.locator('[data-dock-label="Toggle theme"]');
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
  await dock.getByRole('button', { name: 'Toggle sound', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('sound-enabled')))
    .not.toBe(soundState);
  const article = dock.getByRole('link', { name: 'Article', exact: true });
  await article.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${baseURL}/article`);
});

test('keeps hover at the set size and stops the press when reduced motion is enabled', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  const dock = page.locator('footer [data-dock]');
  const home = dock.getByRole('link', { name: 'Home', exact: true });
  const item = dock.locator('[data-dock-label="Home"]');
  await home.hover();
  await expectStill(item);
  const initial = await item.boundingBox();
  await page.mouse.down();
  await expect
    .poll(() =>
      item.evaluate(
        element => element.firstElementChild?.getBoundingClientRect().width
      )
    )
    .toBeCloseTo(38.8, 1);
  expect(await item.boundingBox()).toEqual(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStill(item);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectStill(item);
  await home.hover({ position: { x: 3, y: 20 } });
  await expectStill(item);
});

test('commits a vertical Dock resize on release and keeps the Craft demo independent', async ({
  page,
}) => {
  await page.goto(baseURL);
  const dock = page.locator('footer [data-dock]');
  const handle = dock.getByRole('slider', { name: 'Resize Dock', exact: true });
  const stored = await page.evaluate(() =>
    localStorage.getItem('dock-preferences')
  );
  await expect(handle).toBeVisible();
  const { x, y } = await handle.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 24, { steps: 8 });
  await expect(handle).toHaveAttribute('aria-valuenow', '52');
  expect(
    await page.evaluate(() => localStorage.getItem('dock-preferences'))
  ).toBe(stored);
  await page.mouse.up();
  await expect(dock).not.toHaveAttribute('data-dock-resizing', 'true');
  const demo = page
    .getByRole('group', { name: 'Craft Dock 데모' })
    .getByRole('slider', { name: 'Resize Dock' });
  await demo.press('End');
  await expect(demo).toHaveAttribute('aria-valuenow', '64');
  await expect(handle).toHaveAttribute('aria-valuenow', '52');
  await handle.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '32');
  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '32');
  await expect(demo).toHaveAttribute('aria-valuenow', '40');
  await handle.press('Enter');
  await expect(handle).toHaveAttribute('aria-valuenow', '40');
});
