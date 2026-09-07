import { expect, test, type Locator, type Page } from '@playwright/test';

const ARTICLE = `http://127.0.0.1:${process.env.CI ? 3001 : 3000}/article/immediate-motion-component`;
const FOURTH = '애니메이션 관련 속성 제거';
const FIFTH = '새로운 React 엘리먼트 구성';

async function openExample(page: Page) {
  await page.goto(ARTICLE);
  const select = page.getByRole('combobox').first();
  await select.click();
  await page.getByRole('option', { name: FOURTH, exact: true }).click();
  const root = select.locator('..').locator('..');
  await expect(root.locator('pre')).toContainText('shouldRemoveProp');
  await expect
    .poll(() =>
      root.evaluate(
        element =>
          element
            .getAnimations({ subtree: true })
            .filter(animation => animation.playState === 'running').length
      )
    )
    .toBe(0);
  return root;
}

async function codeProperties(root: Locator) {
  return root
    .locator('pre')
    .evaluate(element =>
      element
        .getAnimations({ subtree: true })
        .flatMap(animation =>
          animation.effect instanceof KeyframeEffect
            ? Object.keys(animation.effect.getKeyframes()[0] ?? {})
            : []
        )
    );
}

test('reduced motion removes code movement, including mid-transition', async ({
  page,
}) => {
  const root = await openExample(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await root.getByRole('button', { name: '다음 단계' }).click();
  await expect(root.locator('pre')).toContainText('Children.map');
  const reducedProperties = await codeProperties(root);
  expect(reducedProperties).not.toContain('transform');
  expect(reducedProperties).not.toContain('height');
  expect(reducedProperties).not.toContain('width');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await root.getByRole('button', { name: '이전 단계' }).click();
  await expect.poll(() => codeProperties(root)).toContain('transform');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cancelledProperties = await codeProperties(root);
  expect(cancelledProperties).not.toContain('transform');
  expect(cancelledProperties).not.toContain('height');
});

test('keyboard selection updates description and code without motion', async ({
  page,
}) => {
  const root = await openExample(page);
  await root.getByRole('button', { name: '다음 단계' }).focus();
  await page.keyboard.press('Enter');
  await expect(root.locator('pre')).toContainText('Children.map', {
    timeout: 250,
  });
  expect(
    await root.evaluate(
      element => element.getAnimations({ subtree: true }).length
    )
  ).toBe(0);
  const select = root.getByRole('combobox');
  await select.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('option', { name: FIFTH, exact: true })
  ).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(
    page.getByRole('option', { name: FOURTH, exact: true })
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(root.locator('pre')).not.toContainText('Children.map', {
    timeout: 250,
  });
  expect(
    await root
      .locator('[aria-hidden="false"]')
      .evaluate(element => element.getAnimations().length)
  ).toBe(0);
});

test('reversing a slide preserves its current visual position', async ({
  page,
}) => {
  const root = await openExample(page);
  const continuity = await root.evaluate(async element => {
    const next = element.querySelector('[aria-label="다음 단계"]');
    const previous = element.querySelector('[aria-label="이전 단계"]');
    if (
      !(next instanceof HTMLButtonElement) ||
      !(previous instanceof HTMLButtonElement)
    ) {
      throw new Error('Step controls missing');
    }
    const sample = () => {
      const panel = element.querySelector('[aria-hidden="false"]');
      if (!(panel instanceof HTMLElement)) {
        throw new Error('Active panel missing');
      }
      const style = getComputedStyle(panel);
      return {
        x: new DOMMatrixReadOnly(style.transform).m41,
        opacity: Number(style.opacity),
      };
    };
    const frames = () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    next.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    const first = sample();
    previous.click();
    await frames();
    next.click();
    await frames();
    return { first, resumed: sample() };
  });
  expect(continuity.first.opacity).toBeGreaterThan(0.5);
  expect(continuity.resumed.opacity).toBeGreaterThan(0.3);
  expect(Math.abs(continuity.resumed.x - continuity.first.x)).toBeLessThan(200);
  await expect(root.locator('pre')).toContainText('Children.map');
  await expect(root.getByRole('combobox')).toHaveText(FIFTH);
});

test('code transitions never animate container dimensions or arbitrary properties', async ({
  page,
}) => {
  const root = await openExample(page);
  await root.getByRole('button', { name: '다음 단계' }).click();
  await expect.poll(() => codeProperties(root)).toContain('transform');
  const properties = await codeProperties(root);
  expect(properties).not.toContain('height');
  expect(properties).not.toContain('width');
  const transitionProperties = await root
    .locator('pre')
    .evaluate(element =>
      [
        element,
        ...element.querySelectorAll(
          '.shiki-magic-move-move, .shiki-magic-move-enter-active, .shiki-magic-move-leave-active'
        ),
      ].map(node => getComputedStyle(node).transitionProperty)
    );
  expect(transitionProperties).not.toContain('all');
});
