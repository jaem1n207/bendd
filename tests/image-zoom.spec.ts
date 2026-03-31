import { expect, test } from '@playwright/test';

test.describe('이미지 줌', () => {
  const ARTICLE_URL = '/article/naming-tokens-in-design';
  const FIRST_IMAGE_ALT =
    '디자인 토큰의 4가지 레벨 구조: NameSpace, Object, Base, Modifier의 계층 관계도';

  test.beforeEach(async ({ page }) => {
    await page.goto(ARTICLE_URL);
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();
    await expect(img).toBeVisible();
  });

  test('이미지 클릭 시 줌 오버레이가 열린다', async ({ page }) => {
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();
    await img.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });

  test('Escape로 줌이 닫힌다', async ({ page }) => {
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();
    await img.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    // 포탈이 완전히 언마운트될 때까지 대기 (transitionEnd 후 DOM에서 제거됨)
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('키보드로 줌 열고 닫은 후 포커스가 원본 이미지에 복원된다', async ({
    page,
  }) => {
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();

    await img.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // 포커스가 원본 이미지에 복원되었는지 확인
    const focusedAlt = await page.evaluate(
      () => document.activeElement?.getAttribute('alt'),
    );
    expect(focusedAlt).toBe(FIRST_IMAGE_ALT);
  });

  test('줌아웃 후 Space로 다시 줌인할 수 있다', async ({ page }) => {
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();

    // 1차 줌인
    await img.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    // 줌아웃
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // 2차 줌인 — 포커스가 복원되어야 Space가 작동
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('스크롤로 줌이 닫힌다', async ({ page }) => {
    const img = page.getByAltText(FIRST_IMAGE_ALT).first();
    await img.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 오버레이 위에서 세로 스크롤 — onWheel 핸들러가 바인딩된 요소 위에서 실행
    const box = await dialog.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.mouse.wheel(0, 100);
    await expect(dialog).toHaveCount(0);
  });
});
