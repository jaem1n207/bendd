import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

async function expectAnchoredOrigin(content: Locator, variable: string) {
  const origins = await content.evaluate((element, name) => {
    const style = getComputedStyle(element);
    const actual = style.transformOrigin;
    const probe = document.createElement('div');
    probe.style.cssText = `position:fixed;box-sizing:${style.boxSizing};width:${style.width};height:${style.height};padding:${style.padding};border:${style.borderWidth} solid transparent;transform-origin:${style.getPropertyValue(name)}`;
    document.body.append(probe);
    const expected = getComputedStyle(probe).transformOrigin;
    probe.remove();
    return { actual, expected };
  }, variable);
  expect(origins.actual).toBe(origins.expected);
}

test('Select keeps its origin after top/bottom collision placement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseURL}/article/naming-tokens-in-design`);
  const trigger = page.getByRole('combobox').first();
  for (const block of ['start', 'end'] as const) {
    await trigger.evaluate(
      (element, alignment) =>
        element.scrollIntoView({ block: alignment, behavior: 'instant' }),
      block
    );
    await trigger.focus();
    await page.keyboard.press('Enter');
    const listbox = page.getByRole('listbox');
    await expect(listbox).toHaveAttribute(
      'data-side',
      block === 'start' ? 'bottom' : 'top'
    );
    await expectAnchoredOrigin(
      listbox,
      '--radix-select-content-transform-origin'
    );
    await page.keyboard.press('Escape');
    await expect(listbox).toHaveCount(0);
  }
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`Select origin, keyboard and preference changes: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`${baseURL}/article/naming-tokens-in-design`);
    const trigger = page.getByRole('combobox').first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expectAnchoredOrigin(
      listbox,
      '--radix-select-content-transform-origin'
    );
    await expect(listbox).toHaveCSS(
      'animation-duration',
      reducedMotion === 'reduce' ? '0s' : '0.15s'
    );
    await expect(listbox).toHaveCSS(
      'animation-timing-function',
      'cubic-bezier(0.2, 0, 0.2, 1)'
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(listbox).toHaveCSS('animation-duration', '0s');
    await expect(listbox).toHaveCSS('animation-delay', '0s');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(listbox).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.keyboard.press('Space');
    await expect(listbox).toBeVisible();
    await expect(listbox).toHaveCSS('animation-duration', '0s');
    await expect(page.getByRole('option').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option').nth(1)).toBeFocused();
    const selected = await page.getByRole('option').nth(1).innerText();
    await page.keyboard.press('Enter');
    await expect(trigger).toContainText(selected);
    await expect(listbox).toHaveCount(0);
  });

  test(`Tooltip origin and open preference change: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(baseURL);
    await page.getByRole('link', { name: 'Home', exact: true }).hover();
    const content = page.locator(
      '[data-side][data-state="delayed-open"], [data-side][data-state="instant-open"]'
    );
    await expect(content).toBeVisible();
    await expectAnchoredOrigin(
      content,
      '--radix-tooltip-content-transform-origin'
    );
    await expect(content).toHaveCSS(
      'animation-duration',
      reducedMotion === 'reduce' ? '0s' : '0.15s'
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(content).toHaveCSS('animation-duration', '0s');
    await expect(content).toHaveCSS('animation-delay', '0s');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(page.locator('[data-side][data-state="closed"]')).toHaveCount(
      0
    );
  });
}

test('Tooltip exit keeps its origin and returns toward the trigger', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  await page.getByRole('link', { name: 'Home', exact: true }).hover();
  const content = page.locator(
    '[data-side][data-state="delayed-open"], [data-side][data-state="instant-open"]'
  );
  await expect(content).toBeVisible();
  await content.evaluate(element => {
    element.addEventListener('animationstart', event => {
      if (event instanceof AnimationEvent && event.animationName === 'exit') {
        const style = getComputedStyle(element);
        document.body.dataset.tooltipExit = JSON.stringify({
          duration: style.animationDuration,
          side: element.getAttribute('data-side'),
          y: style.getPropertyValue('--tw-exit-translate-y').trim(),
        });
      }
    });
  });
  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.locator('body').getAttribute('data-tooltip-exit'))
    .toBeTruthy();
  const exit = JSON.parse(
    (await page.locator('body').getAttribute('data-tooltip-exit')) ?? '{}'
  );
  expect(exit).toEqual({ duration: '0.125s', side: 'top', y: '0.5rem' });
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});
