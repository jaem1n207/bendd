import { expect, test, type Locator, type Page } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const path = '/article/immediate-motion-component';

function example(page: Page) {
  return page.getByRole('combobox').first().locator('..').locator('..');
}

async function selectStep(page: Page, title: string) {
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: title, exact: true }).click();
}

async function codeText(code: Locator) {
  return code.evaluate(element =>
    Array.from(element.children)
      .map(child => {
        if (child.classList.contains('shiki-magic-move-line-number')) {
          return '';
        }
        return child.tagName === 'BR' ? '\n' : child.textContent;
      })
      .join('')
      // The renderer appends a <br> after the final highlighted line.
      .replace(/\n$/, '')
  );
}

async function expectStaticCode(code: Locator) {
  await expect(code).toHaveCSS('--smm-duration', '0ms');
  const failures = await code.evaluate(
    element =>
      new Promise<string[]>(resolve => {
        const violations = new Set<string>();
        let frames = 0;
        const sample = () => {
          if (
            element
              .getAnimations({ subtree: true })
              .some(animation => animation.playState === 'running')
          ) {
            violations.add('running animation');
          }
          element.querySelectorAll('.shiki-magic-move-item').forEach(token => {
            const style = getComputedStyle(token);
            if (style.transform !== 'none') {
              violations.add('token transform');
            }
            if (style.transitionDuration !== '0s') {
              violations.add('token transition');
            }
          });
          if (++frames === 12) {
            resolve([...violations]);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      })
  );
  expect(failures).toEqual([]);
}

test('changing preference preserves horizontal code scroll on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${baseURL}${path}`);
  const code = example(page).locator('.shiki-magic-move-container');
  await expect(code).toContainText('usePrefersReducedMotion');
  const scroller = code.locator('..');
  await scroller.evaluate(element => {
    element.scrollLeft = 100;
  });
  await expect
    .poll(() => scroller.evaluate(element => element.scrollLeft))
    .toBe(100);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStaticCode(code);
  await expect
    .poll(() => scroller.evaluate(element => element.scrollLeft))
    .toBe(100);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => scroller.evaluate(element => element.scrollLeft))
    .toBe(100);
});

test('reduced code supports 4→5→4, syntax colors, line numbers and copying', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseURL,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseURL}${path}`);
  const demo = example(page);
  const code = demo.locator('.shiki-magic-move-container');
  await selectStep(page, '애니메이션 관련 속성 제거');
  await expectStaticCode(code);
  const step4 = await codeText(code);
  await selectStep(page, '새로운 React 엘리먼트 구성');
  await expectStaticCode(code);
  await expect(code).toContainText('Children.map');
  await expect(demo.locator('[aria-hidden="false"]')).toContainText(
    'Children.map'
  );
  await selectStep(page, '애니메이션 관련 속성 제거');
  await expectStaticCode(code);
  expect(await codeText(code)).toBe(step4);
  expect(
    await code.locator('.shiki-magic-move-line-number').count()
  ).toBeGreaterThan(10);

  const colors = () =>
    code
      .locator('.shiki-magic-move-item[style]')
      .evaluateAll(tokens => [
        ...new Set(tokens.map(token => getComputedStyle(token).color)),
      ]);
  const lightColors = await colors();
  expect(lightColors.length).toBeGreaterThan(2);
  await page.getByRole('button', { name: '테마 전환' }).click();
  await expect.poll(colors).not.toEqual(lightColors);
  await expectStaticCode(code);
  await demo.getByRole('button', { name: 'Copy', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(step4);
});

for (const phase of ['description', 'tokens'] as const) {
  test(`enabling reduce during ${phase} settles the selected code and preserves focus`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${baseURL}${path}`);
    const demo = example(page);
    const code = demo.locator('.shiki-magic-move-container');
    await expect(code).toContainText('usePrefersReducedMotion');
    const before = await codeText(code);
    await demo.getByRole('button', { name: '다음 단계' }).click();
    expect(await codeText(code)).toBe(before);
    if (phase === 'tokens') {
      await expect
        .poll(
          () =>
            code.evaluate(
              element =>
                element
                  .getAnimations({ subtree: true })
                  .filter(animation => animation.playState === 'running').length
            ),
          { intervals: [16] }
        )
        .toBeGreaterThan(0);
      await expect(code).toHaveCSS('--smm-duration', '750ms');
    }
    const copy = demo.getByRole('button', { name: 'Copy', exact: true });
    await copy.focus();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectStaticCode(code);
    await expect(code).toContainText('shouldRemoveProp');
    await expect(demo.locator('[aria-hidden="false"]')).toContainText(
      'shouldRemoveProp'
    );
    await expect(copy).toBeFocused();
  });
}
