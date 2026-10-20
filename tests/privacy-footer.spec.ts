import { expect, test, type Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
test.use({ hasTouch: true });

const consentKey = 'bendd-analytics-consent-v1';
const mobile = { width: 390, height: 844 };
const routes = [
  '/',
  '/article',
  '/craft',
  '/article/naming-tokens-in-design',
  '/craft/implement-rauno-style-text-animation',
  '/article/series/ai-coding-agent',
  '/craft/series/synchronize-tab-scrolling',
];

async function sampleMotion(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Array<{ y: number; opacity: number }>>(resolve => {
        const samples: Array<{ y: number; opacity: number }> = [];
        const start = performance.now();
        const sample = () => {
          const element = document.querySelector(
            '[data-privacy-root] aside[data-view="details"]'
          );
          if (element) {
            const style = getComputedStyle(element);
            samples.push({
              y: new DOMMatrixReadOnly(style.transform).m42,
              opacity: Number(style.opacity),
            });
          }
          if (performance.now() - start >= 400) {
            resolve(samples);
            return;
          }
          requestAnimationFrame(sample);
        };
        sample();
      })
  );
}

async function openFooter(page: Page) {
  const footer = page.getByRole('contentinfo', { name: '사이트 하단' });
  const trigger = footer.getByRole('button', {
    name: '쿠키 설정',
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.tap();
  const dialog = page.getByRole('dialog', { name: '쿠키 설정' });
  await expect(dialog).toBeVisible();
  return { footer, trigger, dialog };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, 'denied');
  }, consentKey);
  await page.route('https://www.googletagmanager.com/**', route =>
    route.fulfill({ contentType: 'text/javascript', body: '' })
  );
});

test('모든 페이지에서 고정 버튼 없이 공통 하단에 접근한다', async ({
  page,
}) => {
  await page.setViewportSize(mobile);
  for (const route of routes) {
    await page.goto(`${baseURL}${route}`);
    const footer = page.getByRole('contentinfo', { name: '사이트 하단' });
    await expect(footer).toHaveCount(1);
    await expect(
      footer.getByRole('button', { name: '쿠키 설정', exact: true })
    ).toBeEnabled();
    expect(
      await footer.evaluate(element => getComputedStyle(element).position)
    ).toBe('static');
    await expect(page.locator('[data-privacy-root] button')).toHaveCount(0);
    await expect(footer.getByText(/© \d{4} bendd/)).toHaveCount(1);
    const trigger = footer.getByRole('button', {
      name: '쿠키 설정',
      exact: true,
    });
    await trigger.scrollIntoViewIfNeeded();
    const link = await trigger.boundingBox();
    const dock = await page
      .locator('footer[aria-labelledby="footer-navigation"]')
      .boundingBox();
    expect(link!.height).toBeGreaterThanOrEqual(44);
    expect(link!.width).toBeGreaterThanOrEqual(44);
    expect(link!.y + link!.height).toBeLessThan(dock!.y);
  }
});

test('모바일에서 선택을 확인·변경하고 닫은 링크로 돌아온다', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize(mobile);
  await page.goto(`${baseURL}/article/naming-tokens-in-design`);
  const { trigger, dialog } = await openFooter(page);
  await expect(
    dialog.getByRole('button', { name: /거부하기/ })
  ).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: /분석 쿠키 허용/ }).tap();
  await expect(
    dialog.getByRole('button', { name: /분석 쿠키 허용/ })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('status')).toContainText(
    '이용 분석을 허용했어요.'
  );
  expect(
    await page.evaluate(key => localStorage.getItem(key), consentKey)
  ).toBe('granted');
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('button', { name: '개인정보와 쿠키 자세히 보기' })
    .click();
  for (const viewport of [
    { width: 320, height: 740 },
    mobile,
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(dialog).toHaveCSS('opacity', '1');
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    const choices = await dialog.locator('[aria-pressed]').all();
    for (const choice of choices) {
      const control = await choice.boundingBox();
      expect(control!.x + control!.width).toBeLessThanOrEqual(
        bounds!.x + bounds!.width
      );
      expect(control!.y + control!.height).toBeLessThanOrEqual(viewport.height);
    }
    const details = dialog.getByRole('button', {
      name: /어떤 정보를 살펴보나요/,
    });
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await details.click();
  }
  const controls = dialog.getByRole('button');
  await controls.last().focus();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: '상세 설정 닫기' })
  ).toBeFocused();
  const scroll = await page.evaluate(() => scrollY);
  await dialog.getByRole('button', { name: '상세 설정 닫기' }).tap();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    'hidden'
  );
  await trigger.tap();
  await expect(
    dialog.getByRole('button', { name: /분석 쿠키 허용/ })
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('[data-privacy-backdrop]')
    .tap({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('모바일 설정 창은 아래에서 들어오고 같은 방향으로 닫힌다', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize(mobile);
  await page.goto(`${baseURL}/craft`);
  const trigger = page
    .getByRole('contentinfo', { name: '사이트 하단' })
    .getByRole('button', { name: '쿠키 설정', exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const opening = sampleMotion(page);
  await trigger.tap();
  const entered = await opening;
  expect(entered.length).toBeGreaterThan(2);
  expect(Math.max(...entered.map(frame => frame.y))).toBeGreaterThan(0.1);
  expect(Math.abs(entered.at(-1)!.y)).toBeLessThan(0.1);
  const closing = sampleMotion(page);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '상세 설정 닫기' })
    .tap();
  const exited = await closing;
  expect(Math.max(...exited.map(frame => frame.y))).toBeGreaterThan(0.1);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('동작 감소·키보드 조작에서는 이동 없이 열고 닫는다', async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseURL}/`);
  const trigger = page
    .getByRole('contentinfo', { name: '사이트 하단' })
    .getByRole('button', { name: '쿠키 설정', exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const opening = sampleMotion(page);
  await trigger.tap();
  const samples = await opening;
  expect(samples.length).toBeGreaterThan(2);
  expect(samples.every(frame => Math.abs(frame.y) < 0.1)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const keyboard = sampleMotion(page);
  await trigger.press('Enter');
  expect(
    (await keyboard).every(
      frame => Math.abs(frame.y) < 0.1 && frame.opacity === 1
    )
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
