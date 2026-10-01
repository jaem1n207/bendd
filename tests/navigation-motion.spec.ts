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

test('enabling reduce settles hover and bounce without reviving the old pointer', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  const dock = page.locator('footer [data-dock]');
  const home = dock.getByRole('link', { name: 'Home', exact: true });
  const item = dock.locator('[data-dock-label="Home"]');
  await home.hover();
  await expect
    .poll(() => item.evaluate(element => element.getBoundingClientRect().width))
    .toBeGreaterThan(60);
  await page.mouse.down();
  await expect
    .poll(() =>
      item.evaluate(element => {
        const child = element.firstElementChild;
        return child
          ? child.getBoundingClientRect().top -
              element.getBoundingClientRect().top
          : 0;
      })
    )
    .toBeGreaterThan(0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStill(item);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectStill(item);
  await home.hover({ position: { x: 3, y: 20 } });
  await expect
    .poll(() => item.evaluate(element => element.getBoundingClientRect().width))
    .toBeGreaterThan(50);
  await page.mouse.move(0, 0);
  await expect(item).toHaveCSS('transform', 'none');
  await expect(dock).toHaveAttribute('data-dock-animating', 'false');
});

test('saves dock limits across reloads and keeps the Craft demo independent', async ({
  page,
}) => {
  await page.goto(baseURL);
  const dock = page.locator('footer [data-dock]');
  await dock.getByRole('button', { name: 'Dock 설정', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Dock 설정', exact: true });
  await panel
    .getByRole('slider', { name: '아이콘 크기', exact: true })
    .press('Home');
  await panel
    .getByRole('slider', { name: '확대 크기', exact: true })
    .press('End');
  await expect(
    panel.getByRole('slider', { name: '아이콘 크기', exact: true })
  ).toHaveValue('32');
  await expect(
    panel.getByRole('slider', { name: '확대 크기', exact: true })
  ).toHaveValue('112');
  await panel.getByRole('button', { name: 'Dock 설정 닫기' }).click();
  await page
    .getByRole('slider', { name: '데모 아이콘 크기', exact: true })
    .press('End');
  await expect(
    page.getByRole('slider', { name: '데모 아이콘 크기', exact: true })
  ).toHaveValue('64');
  await expect(dock.locator('[data-navigation-item]').first()).toHaveCSS(
    'width',
    '32px'
  );
  await page.reload();
  await expect(dock.locator('[data-navigation-item]').first()).toHaveCSS(
    'width',
    '32px'
  );
  await dock.getByRole('button', { name: 'Dock 설정', exact: true }).click();
  await expect(
    panel.getByRole('slider', { name: '확대 크기', exact: true })
  ).toHaveValue('112');
  await expect(
    page.getByRole('slider', { name: '데모 아이콘 크기', exact: true })
  ).toHaveValue('40');
});
