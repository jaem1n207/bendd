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

  test.describe('줌 열기', () => {
    test('이미지 클릭 시 줌 오버레이가 열린다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
    });

    test('키보드 Enter로 줌이 열린다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.focus();
      await page.keyboard.press('Enter');

      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('키보드 Space로 줌이 열린다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.focus();
      await page.keyboard.press('Space');

      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('줌 열리면 원본 이미지가 보이지 않는다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // 원본 이미지가 visibility: hidden
      const visibility = await img.evaluate(
        (el) => (el as HTMLElement).style.visibility,
      );
      expect(visibility).toBe('hidden');
    });

    test('줌 열리면 클론 이미지가 body에 렌더링된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // body 직접 자식에 클론 img가 존재
      const cloneExists = await page.evaluate(() => {
        const clones = document.querySelectorAll(`body > img`);
        return clones.length > 0;
      });
      expect(cloneExists).toBe(true);
    });
  });

  test.describe('줌 닫기 — Escape', () => {
    test('Escape로 줌이 닫힌다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('Escape로 닫은 후 원본 이미지가 다시 보인다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      const visibility = await img.evaluate(
        (el) => (el as HTMLElement).style.visibility,
      );
      expect(visibility).not.toBe('hidden');
    });
  });

  test.describe('줌 닫기 — 오버레이 클릭', () => {
    test('오버레이 클릭으로 줌이 닫힌다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // 오버레이의 빈 영역 클릭 (이미지가 아닌 영역)
      const box = await dialog.boundingBox();
      if (box) {
        // 오버레이 좌상단 구석 클릭 (클론 이미지가 아닌 곳)
        await page.mouse.click(box.x + 10, box.y + 10);
      }
      await expect(dialog).toHaveCount(0);
    });
  });

  test.describe('줌 닫기 — 스크롤', () => {
    test('세로 스크롤로 줌이 닫힌다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const box = await dialog.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.mouse.wheel(0, 100);
      await expect(dialog).toHaveCount(0);
    });

    test('스크롤로 닫은 후 원본 이미지가 다시 보인다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const box = await dialog.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.mouse.wheel(0, 100);
      await expect(dialog).toHaveCount(0);

      const visibility = await img.evaluate(
        (el) => (el as HTMLElement).style.visibility,
      );
      expect(visibility).not.toBe('hidden');
    });
  });

  test.describe('포커스 관리', () => {
    test('키보드로 줌 열고 닫은 후 포커스가 원본 이미지에 복원된다', async ({
      page,
    }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();

      await img.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      const focusedAlt = await page.evaluate(
        () => document.activeElement?.getAttribute('alt'),
      );
      expect(focusedAlt).toBe(FIRST_IMAGE_ALT);
    });

    test('클릭으로 줌 열고 닫은 후에도 포커스가 복원된다', async ({
      page,
    }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

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

    test('줌아웃 후 Enter로 다시 줌인할 수 있다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();

      await img.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('3회 연속 줌인/줌아웃 사이클이 정상 동작한다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();

      for (let i = 0; i < 3; i++) {
        await img.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);

        const focusedAlt = await page.evaluate(
          () => document.activeElement?.getAttribute('alt'),
        );
        expect(focusedAlt).toBe(FIRST_IMAGE_ALT);
      }
    });
  });

  test.describe('접근성', () => {
    test('이미지에 role="button"이 설정된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await expect(img).toHaveAttribute('role', 'button');
    });

    test('이미지에 tabindex="0"이 설정된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await expect(img).toHaveAttribute('tabindex', '0');
    });

    test('이미지에 확대 안내 aria-label이 설정된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      const ariaLabel = await img.getAttribute('aria-label');
      expect(ariaLabel).toContain('클릭하여 확대');
    });

    test('줌 오버레이에 aria-modal="true"가 설정된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('줌 오버레이에 aria-label이 설정된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      const ariaLabel = await dialog.getAttribute('aria-label');
      expect(ariaLabel).toBe(FIRST_IMAGE_ALT);
    });

    test('줌 열리면 alt 텍스트가 캡션으로 표시된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // 캡션이 보이는지 확인
      const caption = page.getByRole('dialog').locator('span');
      await expect(caption).toContainText(FIRST_IMAGE_ALT);
    });
  });

  test.describe('body 스크롤 잠금', () => {
    test('줌 열리면 body overflow가 hidden이 된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe('hidden');
    });

    test('줌 닫히면 body overflow가 복원된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).not.toBe('hidden');
    });
  });

  test.describe('SVG data URI', () => {
    // SVG 이미지가 포함된 글에서 테스트 (mermaid 등의 SVG data URI)
    test('SVG data URI 이미지가 존재하면 줌 기능이 비활성화된다', async ({
      page,
    }) => {
      // SVG data URI 이미지 확인
      const svgImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        return Array.from(imgs)
          .filter((img) => img.src.startsWith('data:image/svg+xml'))
          .map((img) => ({
            role: img.getAttribute('role'),
            tabindex: img.getAttribute('tabindex'),
          }));
      });

      // SVG 이미지가 있다면 role="button"이 없어야 함
      for (const svgImg of svgImages) {
        expect(svgImg.role).not.toBe('button');
        expect(svgImg.tabindex).not.toBe('0');
      }
    });
  });

  test.describe('여러 이미지 독립 동작', () => {
    test('첫 번째 이미지를 닫고 두 번째 이미지를 열 수 있다', async ({
      page,
    }) => {
      // 페이지의 모든 줌 가능 이미지 찾기
      const zoomableImages = page.locator('img[role="button"]');
      const count = await zoomableImages.count();

      // 최소 2개의 이미지가 있어야 테스트 가능
      if (count < 2) {
        test.skip();
        return;
      }

      // 첫 번째 이미지 줌
      await zoomableImages.nth(0).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // 닫기
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // 두 번째 이미지 줌
      await zoomableImages.nth(1).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('시각적 상태', () => {
    test('줌 이미지에 cursor: zoom-in이 적용된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      const cursor = await img.evaluate(
        (el) => window.getComputedStyle(el).cursor,
      );
      // Tailwind의 cursor-zoom-in
      expect(cursor).toBe('zoom-in');
    });

    test('오버레이에 cursor: zoom-out이 적용된다', async ({ page }) => {
      const img = page.getByAltText(FIRST_IMAGE_ALT).first();
      await img.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const cursor = await dialog.evaluate(
        (el) => window.getComputedStyle(el).cursor,
      );
      expect(cursor).toBe('zoom-out');
    });
  });
});
