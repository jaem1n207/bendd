import { expect, test } from '@playwright/test';

const baseURL =
  process.env.ARCHITECTURE_BASE_URL ??
  `http://localhost:${process.env.CI ? 3001 : 3000}`;

for (const demo of [
  { path: '/playground/shuffle-letters', iterations: '8', fps: '30' },
  {
    path: '/craft/implement-rauno-style-text-animation',
    iterations: '15',
    fps: '40',
  },
]) {
  test(`${demo.path}: real form starts and Escape stops with the requested text`, async ({
    page,
  }, testInfo) => {
    await page.goto(`${baseURL}${demo.path}`);
    const support = await page.evaluate(() => ({
      modelContext: 'modelContext' in navigator,
    }));
    await testInfo.attach('native-webmcp-support', {
      body: JSON.stringify(support),
      contentType: 'application/json',
    });
    const form = page.getByRole('form', { name: 'Shuffle letters playground' });
    await expect(form).toBeVisible();
    await expect(form.locator('[name="iterations"]')).toHaveValue(
      demo.iterations
    );
    await expect(form.locator('[name="fps"]')).toHaveValue(demo.fps);
    await form.locator('[name="text"]').fill('Browser execution');
    await form.locator('[name="iterations"]').fill('20');
    await form.locator('[name="fps"]').fill('10');
    await form.getByRole('button', { name: 'Shuffle', exact: true }).click();
    await expect(
      form.getByRole('button', { name: 'Shuffling...' })
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(
      form.getByRole('button', { name: 'Shuffle', exact: true })
    ).toBeEnabled();
    await expect(
      page.getByText('Browser execution', { exact: true })
    ).toBeVisible();
  });
}

test('home reveals later sections and preserves visible content on return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  const writing = page.getByRole('heading', { name: 'Writing', exact: true });
  await writing.scrollIntoViewIfNeeded();
  await expect(writing).toBeVisible();
  const reveal = writing.locator('xpath=ancestor-or-self::*[@data-reveal][1]');
  await expect(reveal).toHaveCSS('opacity', '1');
  await expect(reveal).toHaveAttribute('data-reveal-state', 'visible');
  await page.getByRole('link', { name: 'Article', exact: true }).click();
  await expect(page).toHaveURL(/\/article$/);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const content = page.locator(
    '[data-home-motion] [data-reveal]:not([data-reveal-repeat="visit"])'
  );
  await expect
    .poll(() =>
      content.evaluateAll(elements =>
        elements.every(
          element => element.getAttribute('data-reveal-state') === 'visible'
        )
      )
    )
    .toBe(true);
});

test('home reduced motion renders readable sections without pending effects', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const content = page.locator('[data-home-motion] [data-reveal]');
  await expect.poll(() => content.count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      content.evaluateAll(elements =>
        elements.every(element => getComputedStyle(element).opacity === '1')
      )
    )
    .toBe(true);
  await expect
    .poll(() =>
      content.evaluateAll(elements =>
        elements.every(
          element => element.getAttribute('data-reveal-state') === 'visible'
        )
      )
    )
    .toBe(true);
});
