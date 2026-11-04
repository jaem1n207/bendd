import { expect, test, type Locator, type Page } from '@playwright/test';

type ContentFontMetrics = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

type RuntimeFontFace = {
  fontFamily: string;
  src: string;
};

async function assertContentFontContract(
  page: Page,
  route: string
): Promise<void> {
  const fontRequests: string[] = [];
  page.on('request', request => {
    if (request.resourceType() === 'font') {
      fontRequests.push(request.url());
    }
  });

  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);

  const article = page.locator('article[data-content-font="pretendard"]');
  await expect(article).toBeVisible();

  const articleMetrics = await getFontMetrics(article);

  expect(articleMetrics.fontFamily).toContain('Bendd Content');
  expect(articleMetrics.fontFamily).not.toMatch(/Gaegu|Bendd Notes/);
  expect(
    articleMetrics.lineHeight / articleMetrics.fontSize
  ).toBeGreaterThanOrEqual(1.7);

  await assertCodeFontIsolationIfVisible(article, articleMetrics.fontFamily);
  assertSameOriginFontRequests(fontRequests, page.url());
  expect(
    fontRequests.some(url =>
      /\/(notes|home|serif|dots)-(core|extended)\./.test(url)
    )
  ).toBe(false);
  await assertPretendardFontFace(page);
}

async function getFontMetrics(locator: Locator): Promise<ContentFontMetrics> {
  return locator.evaluate(element => {
    const style = window.getComputedStyle(element);

    return {
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
}

async function assertCodeFontIsolationIfVisible(
  article: Locator,
  contentFontFamily: string
): Promise<void> {
  const code = article.locator('code').first();

  if (!(await code.isVisible())) {
    return;
  }

  const codeFontFamily = await code.evaluate(
    element => window.getComputedStyle(element).fontFamily
  );

  expect(codeFontFamily).not.toBe(contentFontFamily);
  expect(codeFontFamily).not.toMatch(/Gaegu|Bendd Notes/);
}

function assertSameOriginFontRequests(
  fontRequests: string[],
  pageUrl: string
): void {
  const pageOrigin = new URL(pageUrl).origin;

  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.every(url => new URL(url).origin === pageOrigin)).toBe(
    true
  );
}

async function assertPretendardFontFace(page: Page): Promise<void> {
  const fontFaces = await getRuntimeFontFaces(page);

  const pretendardFontFace = fontFaces.find(
    ({ fontFamily, src }) =>
      fontFamily.includes('Bendd Content') &&
      !fontFamily.includes('Fallback') &&
      src.includes('content-extended')
  );
  expect(pretendardFontFace).toBeDefined();

  const preloadedFontHrefs = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll(elements =>
      elements
        .map(element => element.getAttribute('href'))
        .filter((href): href is string => href !== null)
    );
  const pretendardFontPath = pretendardFontFace?.src
    .match(/url\(([^)]+)\)/)?.[1]
    ?.replaceAll('"', '')
    .replaceAll("'", '');

  expect(pretendardFontPath).toBeTruthy();
  expect(preloadedFontHrefs.some(href => href.includes('content-core.'))).toBe(
    false
  );
  expect(
    preloadedFontHrefs.some(href => href.endsWith(pretendardFontPath ?? ''))
  ).toBe(false);
  expect(preloadedFontHrefs.some(href => href.includes('-extended.'))).toBe(
    false
  );
}

async function getRuntimeFontFaces(page: Page): Promise<RuntimeFontFace[]> {
  return page.evaluate(() =>
    Array.from(document.styleSheets).flatMap(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .filter((rule): rule is CSSFontFaceRule => {
            if (!(rule instanceof CSSFontFaceRule)) {
              return false;
            }

            const fontFamily = rule.style.getPropertyValue('font-family');

            return fontFamily.includes('Bendd Content');
          })
          .map(rule => ({
            fontFamily: rule.style.getPropertyValue('font-family'),
            src: rule.style.getPropertyValue('src'),
          }));
      } catch {
        return [];
      }
    })
  );
}

test.describe('MDX article detail pages', () => {
  test('should render article page without SSR errors', async ({ page }) => {
    const response = await page.goto('/article/naming-tokens-in-design');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: '정교한 디자인 토큰 설계하기' })
    ).toBeVisible();
  });

  test('should render article content body', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    const article = page.locator('article');
    await expect(article).toBeVisible();
    await expect(article).not.toBeEmpty();
  });

  test('should not show error overlay or 500 page', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=localStorage')).not.toBeVisible();
  });

  test('should render multiple different articles', async ({ page }) => {
    const slugs = [
      'naming-tokens-in-design',
      'perfect-dark-mode',
      'managing-cross-cutting-concerns-sound-playback',
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/article/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.getByRole('heading', { level: 2 }).first();
      await expect(heading).toBeVisible();
    }
  });

  test('should set og:title metadata correctly', async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /정교한 디자인 토큰/);
  });

  test('should keep article typography on the Pretendard font contract', async ({
    page,
  }) => {
    await assertContentFontContract(page, '/article/naming-tokens-in-design');
  });

  test('should isolate code, table, and interactive font surfaces', async ({
    page,
  }) => {
    await page.goto('/article/naming-tokens-in-design');
    await page.evaluate(() => document.fonts.ready);

    const article = page.locator('article[data-content-font="pretendard"]');
    await expect(article).toBeVisible();

    await article.evaluate(element => {
      const fixture = document.createElement('div');
      fixture.dataset.fontFixture = 'true';
      fixture.innerHTML = `
        <code data-font-fixture-code>const token = 'spacing.100';</code>
        <table><tbody><tr><td data-font-fixture-table>표 셀</td></tr></tbody></table>
        <button data-font-fixture-button type="button">확인</button>
        <span data-font-fixture-role role="button" tabindex="0">역할 버튼</span>
      `;
      element.append(fixture);
    });

    const articleFontFamily = await article.evaluate(
      element => window.getComputedStyle(element).fontFamily
    );
    const [codeFontFamily, tableFontFamily, buttonFontFamily, roleFontFamily] =
      await Promise.all([
        page
          .locator('[data-font-fixture-code]')
          .evaluate(element => window.getComputedStyle(element).fontFamily),
        page
          .locator('[data-font-fixture-table]')
          .evaluate(element => window.getComputedStyle(element).fontFamily),
        page
          .locator('[data-font-fixture-button]')
          .evaluate(element => window.getComputedStyle(element).fontFamily),
        page
          .locator('[data-font-fixture-role]')
          .evaluate(element => window.getComputedStyle(element).fontFamily),
      ]);

    expect(codeFontFamily).not.toBe(articleFontFamily);
    expect(codeFontFamily).not.toMatch(/Gaegu|Bendd Notes/);
    expect(tableFontFamily).toBe(articleFontFamily);
    expect(buttonFontFamily).toBe(articleFontFamily);
    expect(roleFontFamily).toBe(articleFontFamily);
  });
});

test.describe('MDX craft detail pages', () => {
  test('should render craft page without SSR errors', async ({ page }) => {
    const response = await page.goto(
      '/craft/implement-rauno-style-text-animation'
    );

    expect(response?.status()).toBe(200);
    const heading = page.getByRole('heading', { level: 2 }).first();
    await expect(heading).toBeVisible();
  });

  test('should render craft content body', async ({ page }) => {
    await page.goto('/craft/implement-rauno-style-text-animation');

    const article = page.locator('article');
    await expect(article).toBeVisible();
    await expect(article).not.toBeEmpty();
  });

  test('should not show error overlay or 500 page on craft', async ({
    page,
  }) => {
    await page.goto('/craft/implement-rauno-style-text-animation');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
  });

  test('should use the same Pretendard font contract on craft details', async ({
    page,
  }) => {
    await assertContentFontContract(
      page,
      '/craft/implement-rauno-style-text-animation'
    );
  });

  test('should keep visual MDX text in the Pretendard content font', async ({
    page,
  }) => {
    await page.goto('/craft/synchronize-tab-scrolling-product-story');
    await page.evaluate(() => document.fonts.ready);

    const article = page.locator('article[data-content-font="pretendard"]');
    await expect(article).toBeVisible();

    const visualCaption = page.getByText(
      '같은 글을 읽어도 목차, 문장 길이, 배너 유무 때문에 스크롤 위치는 쉽게 어긋나요.'
    );
    await expect(visualCaption).toBeVisible();

    const deepDiveBody = page.getByText(
      '동기화 상태와 연결된 탭 정보는 필요하지만, 문서를 읽는 동안 계속 보여야 하는 정보는 아니었어요.'
    );
    await expect(deepDiveBody).toBeVisible();

    const articleFontFamily = await article.evaluate(
      element => window.getComputedStyle(element).fontFamily
    );
    const [captionFontFamily, deepDiveFontFamily] = await Promise.all([
      visualCaption.evaluate(
        element => window.getComputedStyle(element).fontFamily
      ),
      deepDiveBody.evaluate(
        element => window.getComputedStyle(element).fontFamily
      ),
    ]);

    expect(articleFontFamily).toContain('Bendd Content');
    expect(captionFontFamily).toBe(articleFontFamily);
    expect(deepDiveFontFamily).toBe(articleFontFamily);
    expect(captionFontFamily).not.toMatch(/Gaegu|Bendd Notes/);
    expect(deepDiveFontFamily).not.toMatch(/Gaegu|Bendd Notes/);
  });
});
