import { expect, test, type Locator, type Page } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

function cursorFor(page: Page) {
  return page.locator('[data-cursor-visible]');
}

async function boundsFor(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) {
    throw new Error('조작 요소의 위치를 확인할 수 없습니다');
  }
  return bounds;
}

async function expectCue(page: Page, label: string) {
  const cursor = cursorFor(page);
  await expect(cursor).toHaveAttribute('data-cursor-visible', 'true');
  await expect(cursor).toHaveText(label);
  await expect(cursor).toHaveCSS('pointer-events', 'none');
}

test('shows precise contextual guidance for all three Craft demos', async ({
  page,
}) => {
  await page.goto(baseURL);
  const dock = page.getByRole('group', { name: 'Craft Dock 데모' });
  const music = dock.getByRole('button', { name: 'Music 데모' });
  await music.hover();
  await expectCue(page, '클릭해 선택');
  await expect(music).toHaveCSS('cursor', 'pointer');
  await expect(cursorFor(page).locator('svg')).toHaveCount(0);
  await expect(dock.locator('[data-dock-tooltip]')).toHaveCSS(
    'visibility',
    'hidden'
  );
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await expect(cursorFor(page)).toHaveCSS('transition-duration', '0.15s');

  const separator = dock.getByRole('slider', { name: 'Dock 크기 조절' });
  await separator.hover();
  await expectCue(page, '위아래로 끌어 크기 조절 · 우클릭해 설정');
  await expect(separator).toHaveCSS('cursor', 'ns-resize');

  const code = page.getByRole('region', { name: '스크롤로 읽는 코드 설명' });
  await code.hover({ position: { x: 30, y: 30 } });
  await expectCue(page, '스크롤해 설명 읽기');
  await expect(code.locator('[class*="codeBase"]').first()).toHaveCSS(
    'cursor',
    'text'
  );
  await code.getByRole('button', { name: '이전 설명', exact: true }).hover();
  await expectCue(page, '첫 설명입니다');
  await expect(
    code.getByRole('button', { name: '이전 설명', exact: true })
  ).toHaveCSS('cursor', 'default');
  await code.getByRole('button', { name: '다음 설명', exact: true }).hover();
  await expectCue(page, '다음 설명');
  await expect(
    code.getByRole('button', { name: '다음 설명', exact: true })
  ).toHaveCSS('cursor', 'pointer');
  await code.getByRole('button', { name: /^2단계:/ }).click();
  await expectCue(page, '2단계로 이동');
  await expect(code.getByRole('button', { name: /^2단계:/ })).toHaveAttribute(
    'aria-current',
    'step'
  );

  await page
    .getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
    .hover();
  await expectCue(page, '클릭해 다시 섞기');
  await expect(
    page.getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
  ).toHaveCSS('cursor', 'pointer');
  await page.getByRole('link', { name: '문자별 텍스트 셔플' }).hover();
  await expect(cursorFor(page)).toHaveAttribute('data-cursor-visible', 'false');
  await expect(cursorFor(page)).toHaveCSS('transition-duration', '0.1s');
  await expect(page.locator('[data-craft-cursor-active]')).toHaveCount(0);
});

test('keeps a captured Dock drag visible outside the work and restores the cursor on release or Escape', async ({
  page,
}) => {
  await page.goto(baseURL);
  const dock = page.getByRole('group', { name: 'Craft Dock 데모' });
  const separator = dock.getByRole('slider', { name: 'Dock 크기 조절' });
  await separator.hover();
  const initial = Number(await separator.getAttribute('aria-valuenow'));
  const rect = await boundsFor(separator);

  await page.mouse.down();
  await page.mouse.move(18, rect.y - 90, { steps: 5 });
  await expectCue(page, '크기 조절 중');
  await expect(page.locator('html')).toHaveAttribute(
    'data-craft-cursor-dragging',
    'ns-resize'
  );
  await expect(page.locator('body')).toHaveCSS('cursor', 'ns-resize');
  await expect(
    page.locator('footer').getByRole('link', { name: 'Home', exact: true })
  ).toHaveCSS('cursor', 'ns-resize');
  await page.keyboard.down('Shift');
  await expectCue(page, '크기 조절 중');
  await expect(page.locator('body')).toHaveCSS('cursor', 'ns-resize');
  await page.keyboard.up('Shift');
  await expect
    .poll(async () => Number(await separator.getAttribute('aria-valuenow')))
    .toBeGreaterThan(initial);
  await page.mouse.up();
  await expect(cursorFor(page)).toHaveAttribute('data-cursor-visible', 'false');
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-craft-cursor-dragging',
    /.+/
  );
  expect(
    await page.locator('html').evaluate(element => element.style.cursor)
  ).toBe('');

  await separator.hover();
  const committed = await separator.getAttribute('aria-valuenow');
  await page.mouse.down();
  await page.mouse.move(18, rect.y + 70);
  await expectCue(page, '크기 조절 중');
  await page.keyboard.press('Escape');
  await expect(separator).toHaveAttribute('aria-valuenow', committed ?? '');
  await expect(cursorFor(page)).toHaveAttribute('data-cursor-visible', 'false');
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-craft-cursor-dragging',
    /.+/
  );
  await expect(page.locator('[data-craft-cursor-active]')).toHaveCount(0);
  await page.mouse.up();
});

test('guides the owned Dock settings without taking over site navigation', async ({
  page,
}) => {
  await page.goto(baseURL);
  const demo = page.getByRole('group', { name: 'Craft Dock 데모' });
  await demo
    .getByRole('slider', { name: 'Dock 크기 조절' })
    .click({ button: 'right' });
  const dialog = page.getByRole('dialog', { name: 'Dock 설정' });
  const slider = dialog.getByRole('slider', { name: 'Dock 크기', exact: true });
  await slider.hover();
  await expectCue(page, '드래그해 Dock 크기 조절');
  await expect(slider).toHaveCSS('cursor', 'ew-resize');
  await page.mouse.down();
  await page.mouse.move(18, 100);
  await expectCue(page, 'Dock 크기 조절 중');
  await expect(page.locator('html')).toHaveAttribute(
    'data-craft-cursor-dragging',
    'ew-resize'
  );
  await expect(page.locator('body')).toHaveCSS('cursor', 'ew-resize');
  await page.mouse.up();
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-craft-cursor-dragging',
    /.+/
  );
  await expect(page.locator('body')).not.toHaveCSS('cursor', 'ew-resize');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-craft-cursor-active]')).toHaveCount(0);

  await page
    .locator('footer')
    .getByRole('link', { name: 'Home', exact: true })
    .hover();
  await expect(cursorFor(page)).toHaveAttribute('data-cursor-visible', 'false');
  await expect(page.locator('footer [data-dock-tooltip]')).not.toHaveCSS(
    'visibility',
    'hidden'
  );
});

test('matches both themes and keeps the badge inside the viewport during a resize', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.goto(baseURL);
  const dock = page.getByRole('group', { name: 'Craft Dock 데모' });
  const separator = dock.getByRole('slider', { name: 'Dock 크기 조절' });
  const cursor = cursorFor(page);
  const badge = cursor.locator('div').last();
  const colors: string[] = [];

  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    await separator.hover();
    await page.mouse.down();
    await page.mouse.move(995, 715);
    await expectCue(page, '크기 조절 중');
    await expect(badge).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    const bounds = await boundsFor(badge);
    expect(bounds.x).toBeGreaterThanOrEqual(11);
    expect(bounds.y).toBeGreaterThanOrEqual(11);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(989);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(709);
    await expect
      .poll(() =>
        cursor.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return Math.abs(rect.x - 995) + Math.abs(rect.y - 715);
        })
      )
      .toBeLessThan(1);
    colors.push(
      await badge.evaluate(element => getComputedStyle(element).backgroundColor)
    );
    await page.screenshot({
      path: testInfo.outputPath(`craft-cursor-${theme}.png`),
    });
    await page.mouse.up();
  }
  expect(colors[0]).not.toBe(colors[1]);
});

test('removes scale for reduced motion and leaves keyboard controls usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseURL);
  const shuffle = page.getByRole('button', {
    name: '텍스트 셔플 애니메이션 재생',
  });
  await shuffle.hover();
  await expectCue(page, '동작 줄이기 사용 중');
  await expect(cursorFor(page)).toHaveCSS('transition-duration', '0.05s');
  await expect(cursorFor(page).locator('div').last()).toHaveCSS(
    'transform',
    'none'
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectCue(page, '클릭해 다시 섞기');

  const code = page.getByRole('region', { name: '스크롤로 읽는 코드 설명' });
  await code.focus();
  await page.keyboard.press('ArrowDown');
  await expect(cursorFor(page)).toHaveAttribute('data-cursor-visible', 'false');
  await expect(code).toHaveAttribute('data-motion', 'immediate');
  await expect(code.locator('[aria-label^="전체 설명"]')).toHaveAttribute(
    'aria-label',
    /^전체 설명 2 /
  );
});

test('keeps touch controls and inline instructions without a custom cursor', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(baseURL);
    await page
      .getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
      .tap();
    await expect(cursorFor(page)).toHaveCSS('display', 'none');
    await expect(page.locator('[data-craft-cursor-active]')).toHaveCount(0);
    await expect(
      page.getByText('올리거나 눌러 보세요', { exact: true })
    ).toBeVisible();
    const demo = page.getByRole('group', { name: 'Craft Dock 데모' });
    await demo.getByRole('button', { name: 'Music 데모' }).tap();
    await expect(
      demo.getByRole('button', { name: 'Music 데모' })
    ).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await context.close();
  }
});
