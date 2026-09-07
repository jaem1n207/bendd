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
